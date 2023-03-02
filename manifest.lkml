project_name: "viz-artefact-custom-sankey"

constant: VIS_LABEL {
  value: "Artefact's Custom Sankey"
  export: override_optional
}

constant: VIS_ID {
  value: "viz-artefact-custom-sankey"
  export:  override_optional
}

visualization: {
  id: "@{VIS_ID}"
  file: "sankey.js"
  label: "@{VIS_LABEL}"
}
