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

function getTeamNameById(teams, teamId) {
  const team = teams.find((team) => team.id === teamId);
  return team ? team.name : null;
}

async function updateImages({ data }) {
  const { elements, teams } = data;
  document.querySelectorAll('[class*="PitchElement"]').forEach(async (el) => {
    const shirt = el.querySelector('img[class*="Shirt__StyledShirt"]');
    const name = el
      .querySelector('[class*="ElementName"]')
      ?.textContent?.trim()
      .toLowerCase();
    const team = shirt?.alt?.toLowerCase();

    if (!team || !name || !shirt) return;
    const player = findPlayerByNameAndTeam(elements, teams, name, team);
    if (!player) return;

    const pic = shirt.closest("picture") || shirt.parentElement;
    const img = pic?.querySelector("img");
    const source = pic.querySelector("source");

    const imgUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
    const srcset = `${imgUrl} 110w, https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png 250w`;

    if (img && (img.src !== imgUrl || source.srcset !== srcset)) {
      oldSrcset = source.srcset;
      img.src = imgUrl;
      source.srcset = srcset;

      img.onerror = () => {
        source.srcset = oldSrcset;
        return;
      };

      source.sizes = "(min-width: 1024px) 84px, (min-width: 610px) 64px, 46px";
      img.style.cssText = `position: absolute; top: 0; left: 0; right: 30%; width: 100%; height: 110%; object-fit: cover; object-position: top center; padding-top: 10%; padding-bottom: 20%;`;
    }
  });
}

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function startUpdateImagesMutationObserver({ data }) {
  const debouncedUpdateImages = debounce(() => updateImages({ data }), 0);
  const isPitchElement = (node) =>
    node.nodeType === Node.ELEMENT_NODE &&
    (node.classList.contains("PitchElement") ||
      node.querySelector('[class*="PitchElement"]') ||
      node.closest('[class*="PitchElement"]'));
  const hasRelevantMutation = ({ type }) =>
    type === "childList" || type === "attributes" || type === "characterData";
  const isPitchElementInNodes = (nodes) =>
    Array.from(nodes).some(isPitchElement);

  const observer = new MutationObserver((mutations) => {
    const shouldUpdateImages = ({ type, target, addedNodes, removedNodes }) =>
      hasRelevantMutation({ type }) &&
      (isPitchElement(target) ||
        isPitchElementInNodes(addedNodes) ||
        isPitchElementInNodes(removedNodes));
    if (mutations.some(shouldUpdateImages)) {
      debouncedUpdateImages();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["class", "style"],
  });
}

const run = async () => {
  const data = await (
    await fetch("https://fantasy.premierleague.com/api/bootstrap-static/")
  ).json();
  if (data) {
    startUpdateImagesMutationObserver({ data });
  }
};

run();
