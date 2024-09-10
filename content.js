async function fetchPlayerData() {
  try {
    const response = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/"
    );
    const data = await response.json();
    return { elements: data.elements, teams: data.teams };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { elements: [], teams: [] };
  }
}

function getTeamNameById(teams, teamId) {
  const team = teams.find((team) => team.id === teamId);
  return team ? team.name : null;
}

function findPlayerByNameAndTeam(elements, teams, playerName, teamName) {
  return elements.find((player) => {
    const webName = player.web_name;
    const playerTeamName = getTeamNameById(teams, player.team);

    return (
      webName.toLowerCase() == playerName.toLowerCase() &&
      playerTeamName.toLowerCase() === teamName.toLowerCase()
    );
  });
}

async function replaceShirtImages(playerData) {
  const { elements, teams } = playerData;
  const playerElements = document.querySelectorAll('[class*="PitchElement"]');

  for (const playerElement of playerElements) {
    const shirtElement = playerElement.querySelector(
      'img[class*="Shirt__StyledShirt"]'
    );
    if (!shirtElement) {
      continue;
    }

    const playerNameElement = playerElement.querySelector(
      '[class*="ElementName"]'
    );
    if (!playerNameElement) {
      continue;
    }

    const playerName = playerNameElement.textContent.trim();
    const teamName = shirtElement.alt;

    const player = findPlayerByNameAndTeam(
      elements,
      teams,
      playerName,
      teamName
    );

    if (player) {
      const pictureElement =
        shirtElement.closest("picture") || shirtElement.parentElement;
      if (pictureElement) {
        const imgElement = pictureElement.querySelector("img");
        const sourceElement = pictureElement.querySelector("source");
        const newSrc = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
        const newSrcSet = `
                  https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png 110w,
                  https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png 250w
              `;

        // Check if the current src and srcset are already as expected
        const isSrcUpdated = imgElement && imgElement.src !== newSrc;
        const isSrcSetUpdated =
          sourceElement && sourceElement.srcset !== newSrcSet;
        const updateRequired = isSrcUpdated || isSrcSetUpdated;

        if (updateRequired) {
          let oldSrcset;
          if (sourceElement.srcset) {
            oldSrcset = sourceElement.srcset;
          }

          sourceElement.srcset = newSrcSet;

          if (imgElement) {
            imgElement.onerror = () => {
              console.log(`Image loading failed for ${player.web_name}`);
              sourceElement.srcset = oldSrcset;
              return;
            };

            sourceElement.sizes =
              "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
            imgElement.src = newSrc;
            imgElement.style.position = "absolute";
            imgElement.style.top = "0%";
            imgElement.style.left = "0";
            imgElement.style.right = "30%";
            imgElement.style.width = "100%";
            imgElement.style.height = "110%";
            imgElement.style.objectFit = "cover";
            imgElement.style.objectPosition = "top center";
            imgElement.style.paddingTop = "10%";
            imgElement.style.paddingBottom = "20%";
          }
        }
      }
    }
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

async function main() {
  const playerData = await fetchPlayerData();

  if (playerData.elements.length > 0 && playerData.teams.length > 0) {
    await replaceShirtImages(playerData);

    const debouncedReplaceShirtImages = debounce((playerData) => {
      replaceShirtImages(playerData);
    }, 0);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "attributes" ||
          mutation.type === "characterData"
        ) {
          const target = mutation.target;
          const isPitchElement = (node) => {
            return (
              node.nodeType === Node.ELEMENT_NODE &&
              (node.classList.contains("PitchElement") ||
                node.querySelector('[class*="PitchElement"]') ||
                node.closest('[class*="PitchElement"]'))
            );
          };

          if (
            isPitchElement(target) ||
            (mutation.addedNodes &&
              Array.from(mutation.addedNodes).some(isPitchElement)) ||
            (mutation.removedNodes &&
              Array.from(mutation.removedNodes).some(isPitchElement))
          ) {
            debouncedReplaceShirtImages(playerData);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["class", "style"],
    });
  } else {
    console.error("No player data fetched, observer not started");
  }
}

main();
