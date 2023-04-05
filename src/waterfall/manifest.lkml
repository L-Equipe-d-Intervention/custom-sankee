project_name: "viz-artefact-custom-waterfall"

constant: VIS_LABEL {
  value: "Artefact's Custom Waterfall"
  export: override_optional
}

constant: VIS_ID {
  value: "viz-artefact-custom-waterfall"
  export:  override_optional
}

visualization: {
  id: "@{VIS_ID}"
  file: "waterfall.js"
  label: "@{VIS_LABEL}"
}
