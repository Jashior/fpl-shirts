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

function replaceShirtImages(playerData) {
  // console.log("Replacing shirt images...");
  const playerElements = document.querySelectorAll('[class*="PitchElement"]');
  // console.log("Found", playerElements.length, "player elements");

  playerElements.forEach((playerElement) => {
    const shirtElement = playerElement.querySelector(
      'img[class*="Shirt__StyledShirt"]'
    );
    if (!shirtElement) {
      // console.log(`no shirt element`);
      return;
    }

    const playerNameElement = playerElement.querySelector(
      '[class*="ElementName"]'
    );
    if (!playerNameElement) {
      // console.log("Player name element not found");
      return;
    }

    const playerName = playerNameElement.textContent.trim();
    const teamName = shirtElement.alt; //  Get team name from website
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
            ))) // Check for any available team from previous seasons
    );

    if (player) {
      // console.log("Player found:", player.Web_Name, "Code:", player.Code);
      const pictureElement =
        shirtElement.closest("picture") || shirtElement.parentElement;
      if (pictureElement) {
        const imgElement = pictureElement.querySelector("img"); // Get img before replacement
        if (imgElement) {
          imgElement.src = `//resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png`;
          // console.log("Image replaced for player:", player.FPL_Name);
          // console.log(`new element: ${JSON.stringify(imgElement)}`);

          const sourceElements = pictureElement.querySelectorAll("source");
          sourceElements.forEach((sourceElement) => {
            sourceElement.srcset = `
         //resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png 110w,
         //resources.premierleague.com/premierleague/photos/players/250x250/p${player.Code}.png 250w
        `;
            sourceElement.sizes =
              "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
          });

          imgElement.srcset = `
       //resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png 110w,
       //resources.premierleague.com/premierleague/photos/players/250x250/p${player.Code}.png 250w
     `;
          imgElement.sizes =
            "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";

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
        } else {
          // console.log("Image element not found for player:", player.FPL_Name);
        }
      } else {
        // console.log("Picture element not found for player:", player.FPL_Name);
      }
    }
  });
}

async function main() {
  const playerData = await fetchPlayerData();
  // console.log("Fetched player data, count:", playerData.length);

  if (playerData.length > 0) {
    replaceShirtImages(playerData);

    const observer = new MutationObserver((mutations) => {
      // console.log("Mutation detected:", mutations.length, "changes");
      mutations.forEach((mutation) => {
        // console.log("Mutation type:", mutation.type);
        // console.log("Mutation target:", mutation.target);

        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // console.log("Added nodes:", addedNodes.length);
          // console.log("Removed nodes:", removedNodes.length);

          const relevantChanges = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node.classList.contains("PitchElement") ||
                node.querySelector('[class*="PitchElement"]'))
          );

          if (relevantChanges) {
            // console.log("Relevant changes detected, replacing shirt images");
            replaceShirtImages(playerData);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // console.log("Observer started");
  } else {
    console.error("No player data fetched, observer not started");
  }
}

main();
