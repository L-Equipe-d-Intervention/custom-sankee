const nestTree = (dimensions: any, data: any, measureName: string): any => {
  if (dimensions.length > 1) {
    const [dimensionName, ...rest] = dimensions;
    const uniqueValues = [
      ...new Set(data.map((d: any) => d[dimensionName].value)),
    ];
    if (dimensionName === "input_dash.product_group") {
      console.log(uniqueValues);
    }
    return uniqueValues.map((dimensionValue) => {
      const newData = data.filter(
        (d: any) => d[dimensionName].value === dimensionValue
      );
      return {
        key: dimensionValue,
        dimensionName,
        values: nestTree(rest, newData, measureName),
        [measureName]: {
          value: newData.reduce(
            (accumulator: number, currentValue: any) =>
              accumulator + currentValue[measureName].value,
            0
          ),
        },
      };
    });
  }
  return data.map((d: any) => ({
    ...d,
    dimensionName: dimensions[0],
    key: d[dimensions[0]],
  }));
};

export default nestTree;
