// Function to fetch and parse the CSV data
async function fetchPlayerData() {
  try {
    const response = await fetch("https://fpldict.zanaris.dev/code_dict.csv");
    const text = await response.text();
    const rows = text.split("\n").map((row) => row.split(","));
    const headers = rows.shift();
    const playerData = rows.map((row) =>
      Object.fromEntries(headers.map((header, i) => [header, row[i]]))
    );
    return playerData;
  } catch (error) {
    return [];
  }
}

// Function to get the current season based on the current month
function getCurrentSeason() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  return currentMonth >= 7
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;
}

// Function to save the cache to localStorage
function saveCacheToLocalStorage() {
  localStorage.setItem("imageCache", JSON.stringify([...imageCache]));
}

// Function to load the cache from localStorage
function loadCacheFromLocalStorage() {
  const storedCache = localStorage.getItem("imageCache");
  if (storedCache) {
    const parsedCache = new Map(JSON.parse(storedCache));
    parsedCache.forEach((value, key) => imageCache.set(key, value));
  }
}

const imageCache = new Map();
loadCacheFromLocalStorage();

async function imageExists(url) {
  if (!url) {
    console.error("imageExists called with null or undefined URL");
    return false;
  }

  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  try {
    const response = await fetch(url, { method: "HEAD" });
    const exists = response.ok;
    imageCache.set(url, exists);
    saveCacheToLocalStorage(); // Save the cache to localStorage
    return exists;
  } catch (error) {
    console.error("Error checking image:", error);
    imageCache.set(url, false);
    saveCacheToLocalStorage(); // Save the cache to localStorage
    return false;
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

async function replaceShirtImages(playerData) {
  // console.log("Replacing shirt images...");
  const playerElements = document.querySelectorAll('[class*="PitchElement"]');
  // console.log("Found", playerElements.length, "player elements");

  for (const playerElement of playerElements) {
    const shirtElement = playerElement.querySelector(
      'img[class*="Shirt__StyledShirt"]'
    );
    if (!shirtElement) {
      // console.log(`no shirt element`);
      continue;
    }

    const playerNameElement = playerElement.querySelector(
      '[class*="ElementName"]'
    );
    if (!playerNameElement) {
      // console.log("Player name element not found");
      continue;
    }

    const playerName = playerNameElement.textContent.trim();
    const teamName = shirtElement.alt; // Get team name from website
    // console.log("Processing player:", playerName, "Team:", teamName);

    const currentSeason = getCurrentSeason();
    const teamKey = `Team_${currentSeason}`;

    const player = playerData.find(
      (p) =>
        p.Web_Name?.toLowerCase().includes(playerName.toLowerCase()) &&
        (p[teamKey]?.toLowerCase() === teamName.toLowerCase() || // Check for the current season
          (!p[teamKey] && // If current season team is not available
            Object.keys(p).some(
              (key) =>
                key.startsWith("Team_") &&
                p[key]?.toLowerCase() === teamName.toLowerCase()
            )))
    );

    if (player) {
      // console.log("Player found:", player.Web_Name, "Code:", player.Code);
      const pictureElement =
        shirtElement.closest("picture") || shirtElement.parentElement;
      if (pictureElement) {
        // console.log("Player found:", player.Web_Name, "Code:", player.Code);
        const imgElement = pictureElement.querySelector("img");
        const sourceElements = pictureElement.querySelectorAll("source");

        const newSrc = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png`;
        const newSrcSet = `
                  https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png 110w,
                  https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.Code}.png 250w
              `;

        // Check if the current src and srcset are already as expected
        const isSrcUpdated = imgElement && imgElement.src !== newSrc;
        const isSrcSetUpdated =
          sourceElements.length > 0 && sourceElements[0].srcset !== newSrcSet;
        const updateRequired = isSrcUpdated || isSrcSetUpdated;
        // console.log(`upgradeRequired: ${updateRequired}`);
        if (updateRequired) {
          // console.log(player.Web_Name);
          const exists = await imageExists(newSrc);
          if (exists) {
            // console.log("player exists!");
            if (imgElement) {
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
            sourceElements.forEach((sourceElement) => {
              sourceElement.srcset = newSrcSet;
              sourceElement.sizes =
                "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
            });
          } else {
            console.log("Image does not exist for player:", player.FPL_Name);
          }
        }
      } else {
        // console.log("Picture element not found for player:", player.FPL_Name);
      }
    } else {
      // console.log("Player not found:", playerName);
    }
  }
}

async function main() {
  const playerData = await fetchPlayerData();
  // console.log("Fetched player data, count:", playerData.length);

  if (playerData.length > 0) {
    await replaceShirtImages(playerData);

    const debouncedReplaceShirtImages = debounce((playerData) => {
      replaceShirtImages(playerData);
    }, 0); // Adjust debounce delay as needed

    const observer = new MutationObserver((mutations) => {
      // console.log("Mutation detected:", mutations.length, "changes");
      mutations.forEach((mutation) => {
        // console.log("Mutation type:", mutation.type);
        // console.log("Mutation target:", mutation.target);

        if (
          mutation.type === "childList" ||
          mutation.type === "attributes" ||
          mutation.type === "characterData"
        ) {
          const target = mutation.target;

          // Check if the target node or any of its parents is a PitchElement
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
            // console.log("Relevant changes detected, replacing shirt images");
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

    // console.log("Observer started");
  } else {
    console.error("No player data fetched, observer not started");
  }
}

main();
