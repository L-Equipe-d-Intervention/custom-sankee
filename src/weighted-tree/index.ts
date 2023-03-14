import WeightedTree from "./vizuly/WeightedTree";
import * as d3 from "d3-v5";
import "./vizuly/vizuly.css";
import { handleErrors } from "../utils";
// import colors from "../colors.json";

import { Looker, VisualizationDefinition } from "../types";
import nestTree from "./nestTree";

// Global values provided via the API
declare var looker: Looker;

interface Index extends VisualizationDefinition {
  svg?: any;
  viz?: any;
}

// Used to format data tip values
function formatValue(d: number) {
  if (isNaN(d)) d = 0;
  return "$" + d3.format(",.2f")(d) + " Billion";
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
    label_type: {
      default: "name",
      display: "select",
      label: "Label Type",
      type: "string",
      values: [
        { Name: "name" },
        { "Name (value)": "name_value" },
        { "Name: value (percentage)": "name_value_percentage" },
      ],
    },
    show_null_points: {
      type: "boolean",
      label: "Plot Null Values",
      default: true,
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
  updateAsync(data, _element, _config, queryResponse, _details, doneRendering) {
    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: undefined,
        min_measures: undefined,
        max_measures: 0,
      })
    )
      return;

    const dimensions = queryResponse.fields.dimension_like;
    const dimensionNames = dimensions.map((d) => d.name);
    const category = dimensions[dimensions.length - 1].name;
    // const measure = queryResponse.fields.measure_like[0];

    const nestedData = {
      key: "Overall",
      values: nestTree(dimensionNames, data),
    };
    this.viz
      .data(nestedData)
      .key(function (d: any) {
        return d.key || d[category]?.value;
      })
      .value(function () {
        return Math.random();
      })
      .label(function (d: any) {
        return trimLabel(d.key || d[category]?.value);
      })
      .dataTipLabel(function (d: any) {
        return d.key || d[category]?.value;
      });

    this.viz.update();
    doneRendering();
  },
};
looker.plugins.visualizations.add(vis);
