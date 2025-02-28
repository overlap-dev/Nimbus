export OTEL_DENO=true
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-eu-west-2.grafana.net/otlp"

# Read OTLP headers from secret file
if [ -f "./.otel_token" ]; then
  export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(cat ./.otel_token)"
else
  echo "Error: .otel_token file not found. Please create this file with your OTLP headers."
  exit 1
fi

export OTEL_SERVICE_NAME=nimbus-the-expense
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=development

deno run --unstable-otel -A src/main.ts
