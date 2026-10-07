// Package apperr defines the error vocabulary shared by the domain services
// and translated to HTTP status codes by the transport layer.
package apperr

import (
	"errors"
	"fmt"
)

// Code classifies an error so callers can react without string matching.
type Code string

const (
	CodeNotFound    Code = "not_found"
	CodeConflict    Code = "conflict"
	CodeInvalid     Code = "invalid"
	CodeTooLarge    Code = "too_large"
	CodeUnsupported Code = "unsupported_media_type"
)

// Error is a classified, user-safe error. Message is shown to API clients;
// Err (if any) is the underlying cause and is only logged.
type Error struct {
	Code    Code
	Message string
	// Fields holds per-field validation messages, keyed by JSON field name.
	Fields map[string]string
	Err    error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Err }

func NotFound(format string, args ...any) *Error {
	return &Error{Code: CodeNotFound, Message: fmt.Sprintf(format, args...)}
}

func Conflict(format string, args ...any) *Error {
	return &Error{Code: CodeConflict, Message: fmt.Sprintf(format, args...)}
}

func Invalid(format string, args ...any) *Error {
	return &Error{Code: CodeInvalid, Message: fmt.Sprintf(format, args...)}
}

func TooLarge(format string, args ...any) *Error {
	return &Error{Code: CodeTooLarge, Message: fmt.Sprintf(format, args...)}
}

func Unsupported(format string, args ...any) *Error {
	return &Error{Code: CodeUnsupported, Message: fmt.Sprintf(format, args...)}
}

// Validation returns an invalid-input error carrying per-field messages.
func Validation(fields map[string]string) *Error {
	return &Error{Code: CodeInvalid, Message: "validation failed", Fields: fields}
}

// As extracts an *Error from err's chain.
func As(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}

// Is reports whether err carries the given code.
func Is(err error, code Code) bool {
	e, ok := As(err)
	return ok && e.Code == code
}
