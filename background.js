chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url);
    const path = url.pathname;

    if (path === "/my-team" || path.startsWith("/entry/")) {
      chrome.tabs.insertCSS(
        tabId,
        {
          code: `
                    .styles__PitchCard-sc-hv19ot-2.styles__StyledPitchElement-sc-hv19ot-5 {
                        padding-right: 12px;
                    }
                `,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        }
      );
    } else if (path === "/transfers") {
      chrome.tabs.insertCSS(
        tabId,
        {
          code: `
                    .styles__PitchCard-sc-hv19ot-2.styles__StyledPitchElement-sc-hv19ot-5 {
                        padding-right: 0px;
                    }
                `,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        }
      );
    }
  }
});
