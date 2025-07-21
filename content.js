const playersData = {};

let playerDataPromise = null;

const fetchPlayerData = async () => {
  if (playerDataPromise) return playerDataPromise;
  playerDataPromise = fetch(
    "https://fantasy.premierleague.com/api/bootstrap-static/"
  )
    .then((response) => response.json())
    .then((data) => {
      data.elements.forEach((player) => {
        playersData[player.web_name] = player;
      });
    })
    .catch((error) => {
      console.error("Error fetching FPL data:", error);
    });
  return playerDataPromise;
};

const replaceShirtImages = () => {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );

  buttons.forEach((button) => {
    const picture = button.querySelector("picture");
    if (picture) {
      const img = picture.querySelector("img");
      const playerName = button.getAttribute("aria-label");
      const lastPlayer = picture.getAttribute("data-last-player");

      if (playerName && playersData[playerName] && lastPlayer !== playerName) {
        const player = playersData[playerName];
        const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo.replace(
          ".jpg",
          ""
        )}.png`;
        const photo2xUrl = `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo.replace(
          ".jpg",
          ""
        )}.png`;

        const image = new Image();
        image.src = photoUrl;
        image.onload = () => {
          const sources = picture.querySelectorAll("source");
          sources.forEach((source) => {
            source.srcset = `${photoUrl} 1x, ${photo2xUrl} 2x`;
            source.sizes =
              "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
          });
          img.src = photoUrl;
          img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;
          picture.setAttribute("data-last-player", playerName);
        };
        image.onerror = () => {
          console.error(
            `Image failed to load for ${playerName}: ${photoUrl}. Applying fallback.`
          );
          img.src =
            "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
          const sources = picture.querySelectorAll("source");
          sources.forEach((source) => {
            source.srcset =
              "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
          });
          picture.setAttribute("data-last-player", playerName);
        };
      }
    }
  });
};

const observer = new MutationObserver((mutations) => {
  replaceShirtImages();
});

const startObserver = () => {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  observer.observe(targetNode, config);
};

// Utility: Replace shirt image for a single button
function replaceShirtImageForButton(button) {
  const picture = button.querySelector("picture");
  if (picture) {
    const img = picture.querySelector("img");
    const playerName = button.getAttribute("aria-label");
    if (playerName && playersData[playerName]) {
      const player = playersData[playerName];
      const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo.replace(
        ".jpg",
        ""
      )}.png`;
      const photo2xUrl = `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo.replace(
        ".jpg",
        ""
      )}.png`;
      const image = new Image();
      image.src = photoUrl;
      image.onload = () => {
        const sources = picture.querySelectorAll("source");
        sources.forEach((source) => {
          source.srcset = `${photoUrl} 1x, ${photo2xUrl} 2x`;
          source.sizes =
            "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
        });
        img.src = photoUrl;
        img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;
      };
      image.onerror = () => {
        img.src =
          "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
        const sources = picture.querySelectorAll("source");
        sources.forEach((source) => {
          source.srcset =
            "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
        });
      };
    }
  }
}

// Utility: Attach MutationObserver to each button to watch for aria-label changes
function observePlayerButtons() {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );
  buttons.forEach((button) => {
    // Avoid attaching multiple observers
    if (button._playerObserverAttached) return;
    button._playerObserverAttached = true;
    // Initial replacement
    replaceShirtImageForButton(button);
    // Observe aria-label changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-label"
        ) {
          replaceShirtImageForButton(button);
        }
      });
    });
    observer.observe(button, {
      attributes: true,
      attributeFilter: ["aria-label"],
    });
  });
}

function waitForPitchElementsAndObserve(maxAttempts = 20, interval = 150) {
  let lastCount = 0;
  let attempts = 0;
  const check = () => {
    const buttons = document.querySelectorAll(
      '._1k6tww10 button[data-pitch-element="true"]'
    );
    if (buttons.length > 0 && buttons.length === lastCount) {
      fetchPlayerData().then(() => {
        observePlayerButtons();
      });
    } else if (attempts < maxAttempts) {
      lastCount = buttons.length;
      attempts++;
      setTimeout(check, interval);
    } else {
      fetchPlayerData().then(() => {
        observePlayerButtons();
      });
    }
  };
  check();
}

// --- SPA Navigation Handling Only ---
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    waitForPitchElementsAndObserve();
  }
}).observe(document, { subtree: true, childList: true });

fetchPlayerData().then(() => {
  observePlayerButtons();
  startObserver();
});
