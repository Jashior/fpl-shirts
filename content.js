const teamsDataById = {};
const teamsDataByShortName = {};
const playersData = {};
let fixturesData = [];

// Mapping for various team name formats found in alt text
const teamNameMappings = {
  Arsenal: "ARS",
  "Aston Villa": "AVL",
  Bournemouth: "BOU",
  Brentford: "BRE",
  Brighton: "BHA",
  Burnley: "BUR",
  Chelsea: "CHE",
  "Crystal Palace": "CRY",
  Everton: "EVE",
  Fulham: "FUL",
  Leeds: "LEE",
  Liverpool: "LIV",
  "Man City": "MCI",
  "Man Utd": "MUN",
  Newcastle: "NEW",
  "Nott'm Forest": "NFO",
  Sunderland: "SUN",
  Spurs: "TOT",
  "West Ham": "WHU",
  Wolves: "WOL",
};

let playerDataPromise = null;
let fixtureDataPromise = null;

const fetchPlayerData = async () => {
  if (playerDataPromise) return playerDataPromise;
  playerDataPromise = fetch(
    "https://fantasy.premierleague.com/api/bootstrap-static/"
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
      // Error fetching FPL data
    });
  return playerDataPromise;
};

const fetchFixtures = async () => {
  if (fixtureDataPromise) return fixtureDataPromise;
  fixtureDataPromise = fetch("https://fantasy.premierleague.com/api/fixtures/")
    .then((response) => response.json())
    .then((data) => {
      fixturesData = data;
    })
    .catch((error) => {
      // Error fetching fixture data
    });
  return fixtureDataPromise;
};

const getPlayerForButton = async (button) => {
  const playerName = button.getAttribute("aria-label");
  if (!playerName || !playersData[playerName]) {
    return null;
  }

  const candidates = playersData[playerName];
  if (candidates.length <= 1) {
    return candidates[0];
  }

  // Tier 2: Team-Based Disambiguation using shirt image alt text
  const picture = button.querySelector("picture");
  if (picture) {
    const img = picture.querySelector("img");
    if (img && img.alt) {
      const teamNameFromAlt = img.alt.trim();

      // Try multiple approaches to find the team
      let team = null;

      // First try direct lookup by short name
      team = teamsDataByShortName[teamNameFromAlt];

      // If not found, try our comprehensive mapping
      if (!team) {
        const mappedShortName = teamNameMappings[teamNameFromAlt];
        if (mappedShortName) {
          team = teamsDataByShortName[mappedShortName];
        }
      }

      // If still not found, try to find by full team name
      if (!team) {
        team = Object.values(teamsDataById).find(
          (t) => t.name === teamNameFromAlt
        );
      }

      if (team) {
        const foundPlayer = candidates.find((p) => p.team === team.id);
        if (foundPlayer) {
          return foundPlayer;
        }
      }
    }
  }

  // Tier 3: Fixture-Based Disambiguation (fallback)
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
        if (foundPlayer) {
          return foundPlayer;
        }
      }
    }
  }

  // Tier 4: Selection-Based Fallback

  return candidates.reduce((a, b) =>
    parseFloat(a.selected_by_percent) > parseFloat(b.selected_by_percent)
      ? a
      : b
  );
};

const setPlayerImage = (picture, player) => {
  const img = picture.querySelector("img");
  if (!img || !player) return;

  const playerName = player.web_name;
  const photoCode = player.photo.replace(".jpg", "");

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
        "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
      const sources = picture.querySelectorAll("source");
      sources.forEach((source) => {
        source.srcset =
          "https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png";
      });
      picture.setAttribute("data-last-player", playerName);
      return;
    }

    const { url, url2x } = urlsToTry[index];
    const image = new Image();
    image.src = url;

    image.onload = () => {
      const sources = picture.querySelectorAll("source");
      sources.forEach((source) => {
        source.srcset = `${url} 1x, ${url2x} 2x`;
        source.sizes =
          "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
      });
      img.src = url;
      img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;
      picture.setAttribute("data-last-player", playerName);
    };

    image.onerror = () => {
      tryLoadImage(index + 1);
    };
  };

  tryLoadImage(0);
};

const replaceShirtImageForButton = async (button) => {
  const picture = button.querySelector("picture");
  if (picture) {
    const player = await getPlayerForButton(button);
    if (player) {
      const lastPlayerName = picture.getAttribute("data-last-player");
      if (lastPlayerName !== player.web_name) {
        setPlayerImage(picture, player);
      }
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

    const buttonObserver = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-label"
        ) {
          await replaceShirtImageForButton(button);
        }
      }
    });
    buttonObserver.observe(button, {
      attributes: true,
      attributeFilter: ["aria-label"],
    });
  });
};

const mainObserver = new MutationObserver(observePlayerButtons);

const startMainObserver = () => {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  mainObserver.observe(targetNode, config);
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
        startMainObserver();
      });
    } else if (attempts < maxAttempts) {
      lastCount = buttons.length;
      attempts++;
      setTimeout(check, interval);
    } else {
      fetchPlayerData().then(() => {
        observePlayerButtons();
        startMainObserver();
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

waitForPitchElementsAndObserve();
