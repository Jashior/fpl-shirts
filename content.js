// Content script for the Firefox extension

// Function to fetch and parse the CSV data
async function fetchPlayerData() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Jashior/fpl_code_understat_dict/master/code_dict.csv"
    );
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

// Function to replace shirt images with player photos
function replaceShirtImages(playerData) {
  const playerElements = document.querySelectorAll('[class*="PitchElement"]');
  playerElements.forEach((playerElement) => {
    const shirtElement = playerElement.querySelector(
      'img[class*="Shirt__StyledShirt"]'
    );
    if (!shirtElement) return;

    const playerNameElement = playerElement.querySelector(
      '[class*="ElementName"]'
    );
    if (!playerNameElement) return;

    const playerName = playerNameElement.textContent.trim();
    const teamName = shirtElement.alt;

    const player = playerData.find(
      (p) =>
        p.Web_Name?.toLowerCase().includes(playerName.toLowerCase()) &&
        p["Team_2024-25"].toLowerCase() === teamName.toLowerCase()
    );

    if (player) {
      const pictureElement =
        shirtElement.closest("picture") || shirtElement.parentElement;
      if (pictureElement) {
        const newPictureHTML = `
              <picture>
                <div style="width: 100%; padding-top: 127.27%; position: relative; overflow: hidden;">
                  <img src="//resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png"
                       srcset="//resources.premierleague.com/premierleague/photos/players/110x140/p${player.Code}.png 110w,
                               //resources.premierleague.com/premierleague/photos/players/250x250/p${player.Code}.png 250w"
                       sizes="(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px"
                       alt="${player.FPL_Name}"
                       style="position: absolute; top: 0%; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center;">
                </div>
              </picture>
            `;
        pictureElement.innerHTML = newPictureHTML;
      }
    }
  });
}

// Main function to run the script
async function main() {
  const playerData = await fetchPlayerData();
  if (playerData.length > 0) {
    replaceShirtImages(playerData);

    const observer = new MutationObserver((mutations) => {
      replaceShirtImages(playerData);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Run the main function
main();
