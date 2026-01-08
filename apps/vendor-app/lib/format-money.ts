const formatMoney = (value: number | string) => {
  if (typeof value === "number") {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 100_000) {
      return `${(value / 1_000).toFixed(2)}k`;
    }
    return value.toLocaleString();
  }
  return value;
};

export default formatMoney;
