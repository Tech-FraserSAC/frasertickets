package models

import (
	"errors"
)

var (
	ErrNoDocumentModified error
	ErrEditNotAllowed     error
)

func init() {
	ErrNoDocumentModified = errors.New("models: no documents were modified")
	ErrEditNotAllowed = errors.New("models: cannot update forbidden / unknown attr")
}
