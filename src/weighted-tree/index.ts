import WeightedTree from "./vizuly/WeightedTree";
import "./vizuly/vizuly.css";
import * as d3 from "d3-v5";
import { handleErrors } from "../utils";
import colors from "../colors.csv";

import { Looker, VisualizationDefinition } from "../types";
import nestTree from "./nestTree";

// Global values provided via the API
declare var looker: Looker;

interface Index extends VisualizationDefinition {
  svg?: any;
  viz?: any;
}

const formatter = Intl.NumberFormat("en", { notation: "compact" });

// Used to format data tip values
function formatValue(d: number) {
  return formatter.format(d);
}

// Used to trim node labels so they are not too long.
function trimLabel(label: any) {
  return String(label).length > 20
    ? String(label).substr(0, 17) + "..."
    : label;
}

function onMouseOver(_e: any, d: { data: { key: string } }, _i: any) {
  console.log("onMouseOver " + d.data.key);
}

function onMouseOut(_e: any, d: { data: { key: string } }, _i: any) {
  console.log("onMouseOut " + d.data.key);
}

//We can capture click events and respond to them
function onClick(_g: any, d: { data: { key: string } }, _i: any) {
  console.log("onClick " + d.data.key);
}

const vis: Index = {
  id: "weighted-tree", // id/label not required, but nice for testing and keeping manifests in sync
  label: "Weighted Tree",
  options: {
    color_range: {
      type: "array",
      label: "Color Range",
      display: "colors",
      default: [
        "#dd3333",
        "#80ce5d",
        "#f78131",
        "#369dc1",
        "#c572d3",
        "#36c1b3",
        "#b57052",
        "#ed69af",
      ],
    },
  },
  // Set up the initial state of the visualization
  create(element) {
    this.viz = WeightedTree(element);
    this.viz
      .width("100%")
      .height("100%")
      .children(function (d: any[]) {
        return d.values;
      })
      .valueFormatter(formatValue)
      .useZoomToNode(true)
      .useZoom(true)
      .on("mouseover", onMouseOver)
      .on("mouseout", onMouseOut)
      .on("click", onClick);
  },
  // Render in response to the data or settings changing
  updateAsync(data, _element, config, queryResponse, _details, doneRendering) {
    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: undefined,
        min_measures: 1,
        max_measures: 1,
      })
    )
      return;

    const dimensions = queryResponse.fields.dimension_like;
    const dimensionNames = dimensions.map((d) => d.name);
    const category = dimensions[dimensions.length - 1].name;
    const measure = queryResponse.fields.measure_like[0];

    const d3ColorFunction = d3
      .scaleOrdinal()
      .range(config.color_range || vis.options.color_range.default);

    const getColorFromNode = (node: { dimensionName: string; key: string }) => {
      if (node.dimensionName && node.key) {
        const color = colors.find(
          (color: { dimensionName: string; dimensionValue: string }) => {
            return (
              node.dimensionName.endsWith(color.dimensionName) &&
              color.dimensionValue === node.key
            );
          }
        );
        if (color) {
          return color.colorCode;
        }
      }
      return d3ColorFunction(`${node.dimensionName}.${node.key}`);
    };

    const nestedData = {
      key: "Overall",
      values: nestTree(dimensionNames, data, measure.name),
    };
    this.viz
      .data(nestedData)
      .key(function (d: any) {
        return d.key || d[category]?.value;
      })
      .value(function (d: any) {
        return d[measure.name]?.value ?? 0;
      })
      .label(function (d: any) {
        return trimLabel(d.key || d[category]?.value);
      })
      .dataTipLabel(function (d: any) {
        return d.key || d[category]?.value;
      })
      .style("link-stroke", function (d: any) {
        return getColorFromNode(d.target.data);
      })
      .style("node-fill", function (d: any) {
        return getColorFromNode(d.data);
      })
      .style("node-stroke", function (d: any) {
        return getColorFromNode(d.data);
      });

    this.viz.update();
    doneRendering();
  },
};
looker.plugins.visualizations.add(vis);
