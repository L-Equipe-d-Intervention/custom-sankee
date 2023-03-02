project_name: "viz-artefact-custom-sankee"

constant: VIS_LABEL {
  value: "Artefact's Custom Sankee"
  export: override_optional
}

constant: VIS_ID {
  value: "viz-artefact-custom-sankee"
  export:  override_optional
}

visualization: {
  id: "@{VIS_ID}"
  file: "sankee.js"
  label: "@{VIS_LABEL}"
}
