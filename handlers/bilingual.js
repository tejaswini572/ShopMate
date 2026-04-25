function formatBilingual(en, ml) {
  return `${en}\n${ml}`;
}

function formatBilingualSections(enLines, mlLines) {
  const english = (Array.isArray(enLines) ? enLines : [enLines]).filter(Boolean).join("\n");
  const malayalam = (Array.isArray(mlLines) ? mlLines : [mlLines]).filter(Boolean).join("\n");

  if (!english) {
    return malayalam;
  }

  if (!malayalam) {
    return english;
  }

  return `${english}\n\n${malayalam}`;
}

module.exports = {
  formatBilingual,
  formatBilingualSections,
};
