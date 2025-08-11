const playersData = {};

const manualPhotoOverrides = {
  Anderson: '215379',
};

let playerDataPromise = null;

const fetchPlayerData = async () => {
  if (playerDataPromise) return playerDataPromise;
  playerDataPromise = fetch(
    'https://fantasy.premierleague.com/api/bootstrap-static/'
  )
    .then((response) => response.json())
    .then((data) => {
      data.elements.forEach((player) => {
        playersData[player.web_name] = player;
      });
    })
    .catch((error) => {
      console.error('Error fetching FPL data:', error);
    });
  return playerDataPromise;
};

const setPlayerImage = (picture, player) => {
  const img = picture.querySelector('img');
  if (!img) return;

  const playerName = player.web_name;
  const photoCode = player.photo.replace('.jpg', '');

  const finalPhotoCode = manualPhotoOverrides[playerName] || photoCode;

  const urlsToTry = [
    {
      url: `https://resources.premierleague.com/premierleague25/photos/players/110x140/${finalPhotoCode}.png`,
      url2x: `https://resources.premierleague.com/premierleague25/photos/players/250x250/${finalPhotoCode}.png`,
    },
    {
      url: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${finalPhotoCode}.png`,
      url2x: `https://resources.premierleague.com/premierleague/photos/players/250x250/p${finalPhotoCode}.png`,
    },
  ];

  const tryLoadImage = (index) => {
    if (index >= urlsToTry.length) {
      console.error(
        `All image URLs failed for ${playerName}. Applying fallback.`
      );
      img.src =
        'https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png';
      const sources = picture.querySelectorAll('source');
      sources.forEach((source) => {
        source.srcset =
          'https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png';
      });
      picture.setAttribute('data-last-player', playerName);
      return;
    }

    const { url, url2x } = urlsToTry[index];
    const image = new Image();
    image.src = url;

    image.onload = () => {
      const sources = picture.querySelectorAll('source');
      sources.forEach((source) => {
        source.srcset = `${url} 1x, ${url2x} 2x`;
        source.sizes =
          '(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px';
      });
      img.src = url;
      img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;
      picture.setAttribute('data-last-player', playerName);
    };

    image.onerror = () => {
      tryLoadImage(index + 1);
    };
  };

  tryLoadImage(0);
};

const replaceShirtImages = () => {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );

  buttons.forEach((button) => {
    const picture = button.querySelector('picture');
    if (picture) {
      const playerName = button.getAttribute('aria-label');
      const lastPlayer = picture.getAttribute('data-last-player');

      if (playerName && playersData[playerName] && lastPlayer !== playerName) {
        setPlayerImage(picture, playersData[playerName]);
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
  const picture = button.querySelector('picture');
  if (picture) {
    const playerName = button.getAttribute('aria-label');
    if (playerName && playersData[playerName]) {
      setPlayerImage(picture, playersData[playerName]);
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
          mutation.type === 'attributes' &&
          mutation.attributeName === 'aria-label'
        ) {
          replaceShirtImageForButton(button);
        }
      });
    });
    observer.observe(button, {
      attributes: true,
      attributeFilter: ['aria-label'],
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
