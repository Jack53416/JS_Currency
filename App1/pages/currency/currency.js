(function () {
    "use strict";
    WinJS.Namespace.define("CurrencyView", {
        exchangeRates: new WinJS.Binding.List(null),
        ratesForCurrentDate: new WinJS.Binding.List(null),
        storageModel: {
            exRates: [],
            diplayedRates: [],
            selectedItem: null
        },
        
        onDateInvoked: onDateInvoked,
        storeState: storeState,
        loadState: loadState,
        addExchangeRate: function (date, rates) {
            this.exchangeRates.push({ date: date, rates: rates });
            this.storageModel.exRates.push({ date: date, rates: rates });
        },
        clearExchangeRates: function () {
            this.exchangeRates.length = 0;
            this.storageModel.exRates.length = 0;
        },
        showRates: function(rates)
        {
            this.ratesForCurrentDate.length = 0;
            this.storageModel.diplayedRates = rates;
            for (var rate of rates) {
                this.ratesForCurrentDate.push(rate);
            }
        }

    });


    WinJS.UI.Pages.define("/pages/currency/currency.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.
            WinJS.Utilities.query("#buttonDateDownload").listen("click", this.downloadButtonClickHandler.bind(this));
            WinJS.Utilities.query("#closeButton", element).listen("click", this._close.bind(this));
            WinJS.Utilities.query("#dateList", element).listen("loadingstatechanged", this.dateListLoaded.bind(this));
            WinJS.Utilities.query("#dateList", element).listen("iteminvoked", this.onDateInvoked.bind(this));
            WinJS.Utilities.query("#exList", element).listen("iteminvoked", this.nextPage.bind(this));
        },
        downloadButtonClickHandler: downloadButtonClickHandler,
        _close: function (e) { window.close(); },
        dateListLoaded: dateListLoaded,
        onDateInvoked: onDateInvoked,
        nextPage: nextPage,
    });


    function nextPage() {
        var currOptions = [];
        var selectedIndx = document.getElementById("exList").winControl.currentItem.index;
        var selectedCode = CurrencyView.ratesForCurrentDate.getAt(selectedIndx).code;
        for (var rate of CurrencyView.storageModel.diplayedRates)
        {
            currOptions.push(rate.code);
        }
        console.log(selectedCode);
        WinJS.Navigation.navigate("pages/currencyHistory/currencyHistory.html", {
            options: currOptions,
            selectedCode: selectedIndx
        });
    }

    function dateListLoaded(e) {
        var dateList = document.getElementById("dateList");
        dateList.winControl.selection.set(CurrencyView.storageModel.selectedItem);
    }



    function storeState() {
        var localStorage = WinJS.Application.local;
        WinJS.Application.sessionState.currencyView = CurrencyView.storageModel;
       // console.log(WinJS.Application.sessionState.currencyView);

        //Saving User data
        var userData = {
            lastDate: CurrencyView.storageModel.exRates[CurrencyView.storageModel.selectedItem]
        };
        localStorage.writeText("userData.json", JSON.stringify(userData)).then(
            null,
            function error(err) {
                console.log("backup Storage failed");
            }
        );
        
    }
    function loadState() {
        var loadedData = WinJS.Application.sessionState.currencyView;
        var dateList = document.getElementById("dateList");
        //console.log(WinJS.Application.sessionState);
        if (loadedData)
        {
            CurrencyView.storageModel = loadedData;
            CurrencyView.exchangeRates = new WinJS.Binding.List(CurrencyView.storageModel.exRates);
            CurrencyView.ratesForCurrentDate = new WinJS.Binding.List(CurrencyView.storageModel.diplayedRates);
        }
        else
        {
            var localStorage = WinJS.Application.local;
            localStorage.readText("userData.json").then(
                function success(file)
                {
                    var userData = JSON.parse(file);
                    CurrencyView.addExchangeRate(userData.lastDate.date, userData.lastDate.rates);
                    CurrencyView.storageModel.selectedItem = 0;
                    onDateInvoked();
                },
                function failure() {
                    console.log("error Loading user Data");
                }
            );
        }

    }

    function onDateInvoked(e) {
        var dateList = document.getElementById("dateList");
        var selectedItem = dateList.winControl.currentItem.index;
        var itemData = CurrencyView.exchangeRates.getAt(selectedItem);
        CurrencyView.storageModel.selectedItem = selectedItem;
        //console.log(itemData);
        CurrencyView.showRates(itemData.rates);
        storeState();

    }
    function downloadButtonClickHandler(e) {
        var url = "http://api.nbp.pl/api/exchangerates/tables/A/last/67/";
        var xhr = WinJS.xhr({ url: url }).then(
            function (response) {
                CurrencyView.clearExchangeRates();
                var exchangeRateArr = JSON.parse(response.responseText);
                exchangeRateArr.reverse();
                for (var exchangeTab of exchangeRateArr) {
                    CurrencyView.addExchangeRate(exchangeTab.effectiveDate, exchangeTab.rates);
                }
                displayMessage("succ", "Data downloaded correctly!");
                /*storing State*/
                storeState();  
            },
            function (error) {
                displayMessage("err", "Error during file download");
            }
        );

    }

    function displayMessage(type, message) {
        var messageBox = document.getElementById("messages");
        if (type === "err")
        {
            messageBox.style.color = "red";
        }
        else if (type === "succ")
        {
            messageBox.style.color = "green";
        }
        messageBox.innerHTML = message;

    }
})();