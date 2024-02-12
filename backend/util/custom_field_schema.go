package util

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Note that this doesn't include all the possible attributes that a custom property
// can have, but only includes the ones that we would need to parse ourselves or were
// added by us.
type CustomField struct {
	Kind        string `json:"type"`
	UserVisible bool   `json:"userVisible"`
	Editable    bool   `json:"editable"`
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
}

type CustomFieldsSchema struct {
	Kind       string                 `json:"type"`
	Required   []string               `json:"required"`
	Properties map[string]CustomField `json:"properties"`
}

func ConvertRawCustomFieldsSchema(raw map[string]interface{}) (CustomFieldsSchema, error) {
	schema := CustomFieldsSchema{}

	// Deserialize 'type'
	if kindRaw, found := raw["type"]; found {
		if kind, ok := kindRaw.(string); ok {
			schema.Kind = kind
		} else {
			return CustomFieldsSchema{}, fmt.Errorf("key 'type' is not a string")
		}
	} else {
		return CustomFieldsSchema{}, fmt.Errorf("key 'type' is not a list")
	}

	// Deserialize 'required' array
	if requiredRaw, found := raw["required"]; found {
		fmt.Println([]interface{}(requiredRaw.(primitive.A)))
		if requiredRawMongoSerialized, ok := requiredRaw.(primitive.A); ok {
			requiredRawList := []interface{}(requiredRawMongoSerialized)
			required := make([]string, len(requiredRawList))
			for i, v := range requiredRawList {
				if requiredKey, ok := v.(string); ok {
					required[i] = requiredKey
				} else {
					return CustomFieldsSchema{}, fmt.Errorf("element in required list is not a string")
				}
			}
			schema.Required = required
		} else {
			return CustomFieldsSchema{}, fmt.Errorf("key 'required' is not a list")
		}
	} else {
		return CustomFieldsSchema{}, fmt.Errorf("key 'required' was not provided")
	}

	// Deserialize properties
	if propertiesRawInterface, found := raw["properties"]; found {
		if propertiesRawMap, ok := propertiesRawInterface.(map[string]interface{}); ok {
			properties := map[string]CustomField{}

			// Get each raw property
			for key, rawPropertyInterface := range propertiesRawMap {
				property := CustomField{}

				// Deserialize each property
				if rawPropertyMap, ok := rawPropertyInterface.(map[string]interface{}); ok {
					// Deserialize "type" attr in property
					if kindRaw, found := rawPropertyMap["type"]; found {
						if kind, ok := kindRaw.(string); ok {
							property.Kind = kind
						} else {
							return CustomFieldsSchema{}, fmt.Errorf("key 'type' in property '%s' is not string", key)
						}
					} else {
						return CustomFieldsSchema{}, fmt.Errorf("key 'type' in property '%s' was not found", key)
					}

					// Deserialize "userVisible" attr in property
					if userVisibleRaw, found := rawPropertyMap["userVisible"]; found {
						if userVisible, ok := userVisibleRaw.(bool); ok {
							property.UserVisible = userVisible
						} else {
							return CustomFieldsSchema{}, fmt.Errorf("key 'userVisible' in property '%s' is not bool", key)
						}
					} else {
						return CustomFieldsSchema{}, fmt.Errorf("key 'userVisible' in property '%s' was not found", key)
					}

					// Deserialize "editable" attr in property
					if editableRaw, found := rawPropertyMap["editable"]; found {
						if editable, ok := editableRaw.(bool); ok {
							property.Editable = editable
						} else {
							return CustomFieldsSchema{}, fmt.Errorf("key 'editable' in property '%s' is not bool", key)
						}
					} else {
						return CustomFieldsSchema{}, fmt.Errorf("key 'editable' in property '%s' was not found", key)
					}

					// Deserialize "displayName" attr in property
					if displayNameRaw, found := rawPropertyMap["displayName"]; found {
						if displayName, ok := displayNameRaw.(string); ok {
							property.DisplayName = displayName
						} else {
							return CustomFieldsSchema{}, fmt.Errorf("key 'displayName' in property '%s' is not string", key)
						}
					} else {
						return CustomFieldsSchema{}, fmt.Errorf("key 'displayName' in property '%s' was not found", key)
					}

					// Deserialize "description" attr in property
					if descriptionRaw, found := rawPropertyMap["description"]; found {
						if description, ok := descriptionRaw.(string); ok {
							property.Description = description
						} else {
							return CustomFieldsSchema{}, fmt.Errorf("key 'description' in property '%s' is not string", key)
						}
					} else {
						return CustomFieldsSchema{}, fmt.Errorf("key 'description' in property '%s' was not found", key)
					}

					// Add final property to map
					properties[key] = property
				} else {
					return CustomFieldsSchema{}, fmt.Errorf("key '%s' is not object", key)
				}
			}

			// Add property map to overall schema
			schema.Properties = properties
		}
	}

	return schema, nil
}
