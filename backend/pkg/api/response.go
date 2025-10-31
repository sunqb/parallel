package api

import "net/http"

type Envelope map[string]any

type ErrorResponse struct {
	Error string `json:"error"`
}

func Ok(data any) (int, any) {
	return http.StatusOK, Envelope{"data": data}
}

func Accepted(data any) (int, any) {
	return http.StatusAccepted, Envelope{"data": data}
}

func Error(msg string) ErrorResponse {
	return ErrorResponse{Error: msg}
}
