const playersData = {};

const fetchPlayerData = async () => {
  try {
    const response = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/'
    );
    const data = await response.json();

    data.elements.forEach((player) => {
      playersData[player.web_name] = player;
    });
  } catch (error) {
    console.error('Error fetching FPL data:', error);
  }
};

const replaceShirtImages = () => {
  const buttons = document.querySelectorAll(
    '._1k6tww10 button[data-pitch-element="true"]'
  );

  buttons.forEach((button) => {
    const picture = button.querySelector('picture');
    if (picture && !picture.hasAttribute('data-photo-replaced')) {
      const img = picture.querySelector('img');
      const playerName = button.getAttribute('aria-label');

      if (playerName && playersData[playerName]) {
        const player = playersData[playerName];
        const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo.replace(
          '.jpg',
          ''
        )}.png`;
        const photo2xUrl = `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo.replace(
          '.jpg',
          ''
        )}.png`;

        const image = new Image();
        image.src = photoUrl;
        image.onload = () => {
          const sources = picture.querySelectorAll('source');
          sources.forEach((source) => {
            source.srcset = `${photoUrl} 1x, ${photo2xUrl} 2x`;
            source.sizes =
              '(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px';
          });
          img.src = photoUrl;
          img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;

          picture.setAttribute('data-photo-replaced', 'true');
        };
        image.onerror = () => {
          console.error(
            `Image failed to load for ${playerName}: ${photoUrl}. Applying fallback.`
          );
          img.src =
            'https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png';
          const sources = picture.querySelectorAll('source');
          sources.forEach((source) => {
            source.srcset =
              'https://resources.premierleague.com/premierleague/photos/players/250x250/Photo-Missing.png';
          });
          picture.setAttribute('data-photo-replaced', 'true');
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

fetchPlayerData().then(() => {
  replaceShirtImages();
  startObserver();
});
