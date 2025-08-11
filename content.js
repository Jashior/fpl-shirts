const teamsDataById = {};
const teamsDataByShortName = {};
const playersData = {};
let fixturesData = [];

let playerDataPromise = null;
let fixtureDataPromise = null;

const fetchPlayerData = async () => {
  if (playerDataPromise) return playerDataPromise;
  playerDataPromise = fetch(
    'https://fantasy.premierleague.com/api/bootstrap-static/'
  )
    .then((response) => response.json())
    .then((data) => {
      data.teams.forEach((team) => {
        teamsDataById[team.id] = team;
        teamsDataByShortName[team.short_name] = team;
      });

      data.elements.forEach((player) => {
        if (!playersData[player.web_name]) {
          playersData[player.web_name] = [];
        }
        playersData[player.web_name].push(player);
      });
    })
    .catch((error) => {
      console.error('Error fetching FPL data:', error);
    });
  return playerDataPromise;
};

const fetchFixtures = async () => {
  if (fixtureDataPromise) return fixtureDataPromise;
  fixtureDataPromise = fetch('https://fantasy.premierleague.com/api/fixtures/')
    .then((response) => response.json())
    .then((data) => {
      fixturesData = data;
    })
    .catch((error) => {
      console.error('Error fetching fixture data:', error);
    });
  return fixtureDataPromise;
};

const getPlayerForButton = async (button) => {
  const playerName = button.getAttribute('aria-label');
  if (!playerName || !playersData[playerName]) {
    return null;
  }

  const candidates = playersData[playerName];
  if (candidates.length <= 1) {
    return candidates[0];
  }

  // Tier 2: Fixture-Based Disambiguation
  const pitchElement = button.closest(
    "div[class*='PitchElementData__ElementWrapper']"
  );
  if (pitchElement) {
    const teamNameElement = pitchElement.querySelector(
      "div[class*='PitchElementData__TeamName']"
    );
    if (teamNameElement) {
      const opponentShortName = teamNameElement.textContent.trim();
      const opponentTeam = teamsDataByShortName[opponentShortName];
      if (opponentTeam) {
        await fetchFixtures();
        const foundPlayer = candidates.find((p) =>
          fixturesData.some(
            (f) =>
              (f.team_h === p.team && f.team_a === opponentTeam.id) ||
              (f.team_a === p.team && f.team_h === opponentTeam.id)
          )
        );
        if (foundPlayer) return foundPlayer;
      }
    }
  }

  // Tier 3: Selection-Based Fallback
  console.warn(
    `Could not disambiguate player '${playerName}' via fixture list. Falling back to 'selected_by_percent'.`
  );

  return candidates.reduce((a, b) =>
    parseFloat(a.selected_by_percent) > parseFloat(b.selected_by_percent)
      ? a
      : b
  );
};

const setPlayerImage = (picture, player) => {
  const img = picture.querySelector('img');
  if (!img || !player) return;

  const playerName = player.web_name;
  const photoCode = player.photo.replace('.jpg', '');

  const urlsToTry = [
    {
      url: `https://resources.premierleague.com/premierleague25/photos/players/110x140/${photoCode}.png`,
      url2x: `https://resources.premierleague.com/premierleague25/photos/players/250x250/${photoCode}.png`,
    },
    {
      url: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png`,
      url2x: `https://resources.premierleague.com/premierleague/photos/players/250x250/p${photoCode}.png`,
    },
  ];

  const tryLoadImage = (index) => {
    if (index >= urlsToTry.length) {
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

const replaceShirtImages = async () => {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );

  for (const button of buttons) {
    const picture = button.querySelector('picture');
    if (picture) {
      const lastPlayerName = picture.getAttribute('data-last-player');
      const player = await getPlayerForButton(button);

      if (player && lastPlayerName !== player.web_name) {
        setPlayerImage(picture, player);
      }
    }
  }
};

const observer = new MutationObserver(replaceShirtImages);

const startObserver = () => {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  observer.observe(targetNode, config);
};

const replaceShirtImageForButton = async (button) => {
  const picture = button.querySelector('picture');
  if (picture) {
    const player = await getPlayerForButton(button);
    if (player) {
      setPlayerImage(picture, player);
    }
  }
};

const observePlayerButtons = () => {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );
  buttons.forEach((button) => {
    if (button._playerObserverAttached) return;
    button._playerObserverAttached = true;

    replaceShirtImageForButton(button);

    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'aria-label'
        ) {
          await replaceShirtImageForButton(button);
        }
      }
    });
    observer.observe(button, {
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  });
};

const waitForPitchElementsAndObserve = (maxAttempts = 20, interval = 150) => {
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
};

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
