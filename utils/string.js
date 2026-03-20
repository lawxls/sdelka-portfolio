function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function reverse(str) {
  return [...str].reverse().join('');
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

module.exports = { capitalize, reverse, truncate };
