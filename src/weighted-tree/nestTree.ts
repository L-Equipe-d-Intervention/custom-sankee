const nestTree = (dimensions: any, data: any): any => {
  if (dimensions.length > 1) {
    const [dimension, ...rest] = dimensions;
    const uniqueValues = [...new Set(data.map((d: any) => d[dimension].value))];
    return uniqueValues.map((dimensionValue) => ({
      key: dimensionValue,
      values: nestTree(
        rest,
        data.filter((d: any) => d[dimension].value === dimensionValue)
      ),
    }));
  }
  return data;
};

export default nestTree;
