{{/*
Expand the name of the chart.
*/}}
{{- define "erp-system.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "erp-system.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "erp-system.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "erp-system.labels" -}}
helm.sh/chart: {{ include "erp-system.chart" . }}
{{ include "erp-system.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "erp-system.selectorLabels" -}}
app.kubernetes.io/name: {{ include "erp-system.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service labels
*/}}
{{- define "erp-system.serviceLabels" -}}
{{ include "erp-system.labels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "erp-system.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "erp-system.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database connection string template
*/}}
{{- define "erp-system.databaseUrl" -}}
{{- $dbName := .dbName -}}
{{- $dbUser := .dbUser -}}
Host={{ $.Release.Name }}-postgresql;Database={{ $dbName }};Username={{ $dbUser }};Password=$(POSTGRES_PASSWORD)
{{- end }}

{{/*
Kafka bootstrap servers
*/}}
{{- define "erp-system.kafkaBootstrapServers" -}}
{{ .Release.Name }}-kafka:9092
{{- end }}

{{/*
MinIO endpoint
*/}}
{{- define "erp-system.minioEndpoint" -}}
{{ .Release.Name }}-minio:9000
{{- end }}
