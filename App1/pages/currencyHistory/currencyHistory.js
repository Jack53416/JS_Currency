(function () {
    WinJS.Namespace.define("cHistoryView", {
        currencyName: "",
        rates: [],
    });

    WinJS.UI.Pages.define("/pages/currencyHistory/currencyHistory.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.

            WinJS.Utilities.query("#buttonPlot").listen("click", this.downloadHistory.bind(this));
            WinJS.Utilities.query("#backButton", element).listen("click", this._back.bind(this));
            WinJS.Utilities.query("#closeButton", element).listen("click",this._close.bind(this));
            
            var currOptions = document.getElementById("currSelect");
            if (WinJS.Navigation.state.options)
            {
                for (var option of WinJS.Navigation.state.options)
                {
                    var newOption = document.createElement("option");
                    newOption.text = option;
                    currOptions.add(newOption);
                }
                if (WinJS.Navigation.state.selectedCode)
                {
                    currOptions.selectedIndex = WinJS.Navigation.state.selectedCode;
                }
            }
            
            
        },
        _close: function (e) { window.close(); },
        _back: function goBack() {
            WinJS.Navigation.navigate('/pages/currency/currency.html');
        },
        downloadHistory : downloadHistory
    });

    

    function downloadHistory() {
        var dateFrom = document.getElementById("datePickerFrom").winControl.current;
        var dateTo = document.getElementById("datePickerTo").winControl.current;
        var cSymbol = document.getElementById("currSelect").value;

        if (validateDates(dateFrom, dateTo) === true) {
            cHistoryView.rates.length = 0;
            cHistoryView.currencyName = cSymbol;

            var urls = createUrls(dateFrom, dateTo, cSymbol);
            console.log(urls);
            downloadData(urls).then(
                function () {
                    if (cHistoryView.rates.length < 2) {
                        return displayError("To few Elements to plot the chart!");
                    }
                    cHistoryView.rates.sort(function (a, b) {
                        var d1 = a.date;
                        var d2 = b.date;
                        return d1.getTime() - d2.getTime();
                    });
                    console.log(JSON.stringify(cHistoryView.rates));
                    drawChart();
                    displayError("");
                }
            );

        }


    }

    function displayError(err) {
        var errBox = document.getElementById("messages");
        errBox.style.color = "red";
        errBox.innerHTML = err;
    }
    function downloadData(urls) {
        /*var bar = document.getElementById("progressBar");
        bar.value = 0;*/
        var xhrs = urls.map(function (url) {
            return WinJS.xhr({ url: url });/*.done(
                function () {
                    bar.value += Math.round(100 / urls.length);
                    console.log(bar.value);
                });*/
        });

        var downloading = WinJS.Promise.join(xhrs).then(
            function (files) {
                for (var file in files) {
                    var content = JSON.parse(files[file].responseText);
                    for (var rate of content.rates) {
                        cHistoryView.rates.push({
                            date: new Date(rate.effectiveDate),
                            value: rate.mid
                        });
                    }
                }
            },
            function (err) {
                displayError("Error during downloading process!");
                console.log("Download Error")
            },
        );

        return downloading;
    }

    function validateDates(dateFrom, dateTo) {
        const halfDay = 1000 * 60 * 60 * 12;
        if (dateFrom.getTime() >= dateTo.getTime()) {
            displayError("DateFrom older or equal to date To ! ");
            return false;
        }
        if (dateTo.getTime() - halfDay > Date.now()) {
            displayError("dateTo is in the future!");
            return false;
        }
        return true;

    }

    function createUrls(dateFrom, dateTo, cSymbol) {
        const oneDay = 1000 * 60 * 60 * 24;
        const dayChunk = 367;
        const partialUrl = "http://api.nbp.pl/api/exchangerates/rates/a/"
        var urls = [];

        var dayCount = Math.round((dateTo - dateFrom) / oneDay);
        var partialDates = [dateFrom];
        while (dayCount > dayChunk) {
            var newDate = partialDates[partialDates.length - 1].addDays(dayChunk);
            dayCount -= dayChunk;
            partialDates.push(newDate);
        }
        partialDates.push(dateTo);

        for (var i = 1; i < partialDates.length; i++) {
            var url = partialUrl + cSymbol + "/" + partialDates[i - 1].getFullDate() + "/" + partialDates[i].getFullDate();
            partialDates[i] = partialDates[i].addDays(1);
            urls.push(url);
        }
        return urls;
    }

    function drawChart() {
        var canvas = document.getElementById("canv");
        var context = canvas.getContext("2d");
        const margin = 40;
        const marginAxis = 10;
        var width = canvas.width;
        var height = canvas.height;
        const xRes = width - 2 * margin - 2 * marginAxis;
        const yRes = height - 2 * margin - 2 * marginAxis;
        context.clearRect(0, 0, width, height);
        /* draw Axis*/
        context.fillStyle = "rgb(0, 0, 0)";
        context.fillRect(margin, margin, 2, height - 2 * margin);
        context.fillRect(margin, height - margin, width - 2 * margin, 2);
        // draw arrowheads
        context.beginPath();
        context.moveTo(margin - 5, margin + 5);
        context.lineTo(margin + 7, margin + 5);
        context.lineTo(margin + 1, margin);
        context.lineTo(margin - 5, margin + 5);
        context.fill();

        context.beginPath();
        context.moveTo(width - margin - 5, height - margin - 5);
        context.lineTo(width - margin - 5, height - margin + 7);
        context.lineTo(width - margin, height - margin + 1);
        context.lineTo(width - margin - 5, height - margin - 5);
        context.fill();

        //calculate 
        const oneDay = 1000 * 60 * 60 * 24;
        var len = cHistoryView.rates.length - 1;
        var xMin = cHistoryView.rates[0].date;
        var xMax = cHistoryView.rates[len].date;
        var xSpread = Math.round((cHistoryView.rates[len].date - cHistoryView.rates[0].date) / oneDay);
        var yMax = cHistoryView.rates[0].value;
        var yMin = cHistoryView.rates[0].value;

        for (var rate of cHistoryView.rates) {
            if (rate.value > yMax)
                yMax = rate.value;
            if (rate.value < yMin)
                yMin = rate.value;
        }
        var ySpread = yMax - yMin;

        console.log("dC:" + xSpread);
        console.log("yMax" + yMax);
        console.log("yMin" + yMin);
        console.log("ySpread" + ySpread);

        //draw actual chart
        context.strokeStyle = "red";
        context.beginPath();
        context.moveTo(mapDate(cHistoryView.rates[0].date, xMin, xSpread, xRes) + margin + marginAxis,
            mapVal(cHistoryView.rates[0].value, yMax, ySpread, yRes) + margin + marginAxis);
        console.log("map" + mapVal(cHistoryView.rates[0].value, yMax, ySpread, yRes));
        console.log("mapX " + mapDate(cHistoryView.rates[0].date, xMin, xSpread, xRes));
        var mappedX = 0;
        var mappedY = 0;
        for (var rate of cHistoryView.rates) {
            mappedX = mapDate(rate.date, xMin, xSpread, xRes);
            mappedY = mapVal(rate.value, yMax, ySpread, yRes);
            context.lineTo(mappedX + margin + marginAxis, mappedY + margin + marginAxis);
        }
        context.stroke();
        //draw Text
        context.font = "10px Arial";
        context.fillText(xMin.getFullDate(), margin / 2, height - margin / 2);
        context.fillText(xMax.getFullDate(), margin / 2 + xRes, height - margin / 2);
        context.fillText(yMin, margin / 8, height - margin - marginAxis);
        context.fillText(yMax, margin / 8, margin + marginAxis);
        // draw Assym
        context.beginPath();
        context.strokeStyle = "blue";
        context.setLineDash([5, 10]);
        context.moveTo(margin, margin + marginAxis);
        context.lineTo(width - margin - marginAxis, margin + marginAxis);
        context.stroke();

        context.moveTo(margin, height - margin - marginAxis);
        context.lineTo(width - margin - marginAxis, height - margin - marginAxis);
        context.stroke();
        context.setLineDash([]);
    }

    function mapDate(val, minDate, spread, resolution) {
        const oneDay = 1000 * 60 * 60 * 24;
        var dayNr = Math.round((val - minDate) / oneDay);
        return Math.round(dayNr / spread * resolution);

    }
    function mapVal(val, maxVal, spread, resolution) {
        return Math.round((maxVal - val) / spread * resolution);
    }

    Date.prototype.getFullDate = function () {
        var dat = new Date(this.valueOf());
        var day = dat.getDate();
        var month = dat.getMonth() + 1;
        if (day < 10)
            day = "0" + day;
        if (month < 10)
            month = "0" + month;
        return dat.getFullYear() + "-" + month + "-" + day;

    }
    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    }

})();