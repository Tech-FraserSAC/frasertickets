package models

import (
	"errors"
)

var (
	ErrNoDocumentModified error
	ErrEditNotAllowed     error
	ErrAlreadyExists      error
	ErrNotFound           error
)

func init() {
	ErrNoDocumentModified = errors.New("models: no documents were modified/deleted")
	ErrEditNotAllowed = errors.New("models: cannot update forbidden / unknown attr")
	ErrAlreadyExists = errors.New("models: document already exists when it should be unique")
	ErrNotFound = errors.New("models: document could not be found")
}
