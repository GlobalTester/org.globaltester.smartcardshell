/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2010 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  ---------
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * @fileoverview Form processing
 */


var I18N = require('scsh/srv-cc1/I18N').I18N;



/**
 * Create from from a template
 *
 * @class Class supporting HTML form construction and processing using a JSON description of sections and fields
 *
 * @param {Object} template containing sections and fields
 */
function Form(template) {
	this.form = template;

	this.classForm = "pure-form pure-form-aligned";
	this.classGrid = "pure-g";
	this.classLabel = "pure-u-1 pure-u-sm-2-5 pure-u-md-1-5 pure-u-lg-1-6 pure-u-xl-1-8";
	this.classField = "pure-u-1 pure-u-sm-3-5 pure-u-md-4-5 pure-u-lg-5-6 pure-u-xl-7-8";
	this.classSelect = "pure-input-1";
	this.classValidationError = "validationerror";
}

exports.Form = Form;



/**
 * Set an I18N handler that implements a method i18n() that translates a key string into a string in the language of the
 * current user
 *
 * @param {Object} Object implementing String i18n(String key)
 */
Form.prototype.setI18NHandler = function(handler) {
	assert(typeof(handler.i18n) == "function", "I18N handler must have a function i18n");
	this.i18nHandler = handler;
}



/**
 * @private
 */
Form.prototype.i18n = function(key) {
	if (typeof(this.i18nHandler) != "undefined")
		return this.i18nHandler.i18n(key);
	return key;
}



/**
 * Render input field
 *
 * @private
 */
Form.prototype.renderInput = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var input = <input id={ fld.id } name={ fld.id } type={ fld.type } size={ fld.size } value={ fld.value } class="pure-input-1"/>;

	if (fld.required) {
		input.@required = "true";
	}

	if (!fld.editable) {
		input.@readonly = "readonly";
	}

	if (typeof(fld.min) != "undefined") {
		input.@min = fld.min;
	}

	if (typeof(fld.max) != "undefined") {
		input.@max = fld.max;
	}

	if (fld.placeholder) {
		input.@placeholder = fld.placeholder;
	}

	return input;
}



/**
 * Render date input field
 *
 * @private
 */
Form.prototype.renderDate = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var input = <input id={ fld.id } name={ fld.id } type={ fld.type } class="pure-input-1"/>;

	if (fld.required) {
		input.@required = "true";
	}

	if (!fld.editable) {
		input.@readonly = "readonly";
	}

	if (typeof(fld.min) != "undefined") {
		input.@min = fld.min;
	}

	if (typeof(fld.max) != "undefined") {
		input.@max = fld.max;
	}

	if (typeof(fld.value) != "undefined") {
		input.@value = fld.value;
	}

	return input;
}



/**
 * Render file input field
 *
 * @private
 */
Form.prototype.renderFileInput = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var input = <input id={ fld.id } name={ fld.id } type={ fld.type } class="pure-input-1"/>;

	if (fld.required) {
		input.@required = "true";
	}

	if (!fld.editable) {
		input.@readonly = "readonly";
	}

	if (typeof(fld.value) != "undefined") {
		input.@value = fld.value;
	}

	return input;
}



/**
 * Render text area field
 *
 * @private
 */
Form.prototype.renderTextArea = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var input = <textarea id={ fld.id } name={ fld.id } cols={ fld.cols } rows={ fld.rows } class="pure-input-1">{ fld.value }</textarea>;

	if (fld.required) {
		input.@required = "true";
	}

	if (!fld.editable) {
		input.@readonly = "readonly";
	}

	if (typeof(fld.size) != "undefined") {
		input.@maxlength = fld.size;
	}

	return input;
}



/**
 * Render selection list, single or multiselect
 *
 * @private
 */
Form.prototype.renderSelect = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var select = <select id={ fld.id } name={ fld.id } class={ this.classSelect }/>;

	if (!fld.editable) {
		select.@disabled = "disabled";
	}

	if (fld.multiselect) {
		select.@multiple = "multiple";
	}

	if (fld.required) { // required = "false" doesn't work in Firefox (version 78.6.1esr) but it works in Chromium (version 87.0.4280.141)
		select.@required = fld.required;
	}

	if (typeof(fld.size) != "undefined") {
		select.@size = fld.size;
	}

	for (var i = 0; i < fld.value.length; i++) {
		var o = fld.value[i];

		if (o.optgroup) {
			select.appendChild(this.renderOptionGroup(o));
		} else {
			select.appendChild(this.renderOption(o));
		}
	}

	return select;
}



/**
 * Render an option
 *
 * @private
 */
Form.prototype.renderOption = function(o) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (o.msg) {
		var str = this.i18n(o.msg);
	} else {
		var str = o.value;
	}
	var option = <option value={ o.id } >{ str }</option>;

	if (o.labelmsg) {
		option.@label = this.i18n(o.labelmsg);
	}

	if (o.label) {
		option.@label = o.label;
	}

	if (o.selected) {
		option.@selected = "selected";
	}

	if (o.disabled) {
		option.@disabled = "disabled";
	}

	return option;
}



/**
 * Render checkbox input field
 *
 * @private
 */
Form.prototype.renderCheckbox = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

        var input = <input type="checkbox" id={ fld.id } name={ fld.id } />

        if (fld.checked) {
		input.@checked = "checked";
	}

	if (fld.required) {
		input.@required = "true";
	}

	if (!fld.editable) {
		input.@readonly = "readonly";
		input.@disabled = "disabled";
	}

	var label = <label for={ fld.id }>
            {input} { fld.value }
        </label>

	return label;
}



/**
 * Render the select option group
 *
 * @private
 */
Form.prototype.renderOptionGroup = function(grp) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var optgroup = <optgroup label={ grp.label }></optgroup>

	for (var i = 0; i < grp.value.length; i++) {
		var o = grp.value[i];
		optgroup.appendChild(this.renderOption(o));
	}

	return optgroup;
}



/**
 * Render status field (feature #200)
 *
 * @private
 */
Form.prototype.renderLink = function(fld) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var text = this.i18n( fld.value )

	var p = <p/>;

	var parts = text.split("{0}");

	p.appendChild(parts[0]);

	if (typeof(fld.href) == "string") {
		var link = <a href={fld.href}>Link</a>

		for (var i = 1; i < parts.length; i++) {
			p.appendChild(link);
			p.appendChild(parts[i]);
		}
	}

	return p;
}



/**
 * Render other field types
 *
 * Should be overwritten by derived classes implementing additional field types
 *
 * @param {Object} fld the field description
 */
Form.prototype.renderOther = function(fld) {
	throw new GPError(module.id, GPError.INVALID_DATA, 0, "Unknown field type " + fld.type);
}



/**
 * Render form as HTML form element
 *
 * @type XML
 * @return the XHTML form element
 */
Form.prototype.render = function() {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var html = <form action="" method="post" enctype="multipart/form-data" class={ this.classForm }/>;
	for (var fsi = 0; fsi < this.form.length; fsi++) {
		var fs = this.form[fsi];

		var fieldset =  <fieldset id={ fs.id } ><legend>{ this.i18n( fs.legend ) }</legend></fieldset>;

		for (var fli = 0; fli < fs.fields.length; fli++) {
			var fld = fs.fields[fli];


			var grid = <div class={ this.classGrid } />;
			var div = <div class={ this.classLabel } />;
			if (fld.label) {
				var label = <label for={ fld.id } >{ this.i18n(fld.label) }</label>
				div.appendChild(label);
			}
			grid.appendChild(div);

			var div = <div class={ this.classField }/>;

			switch(fld.type) {
				case "number":
				case "text":
					var elem = this.renderInput(fld);
					break;
				case "date":
					var elem = this.renderDate(fld);
					break;
				case "file":
					var elem = this.renderFileInput(fld);
					break;
				case "select":
					var elem = this.renderSelect(fld);
					break;
				case "textarea":
					var elem = this.renderTextArea(fld);
					break;
				case "link":
					var elem = this.renderLink(fld);
					break;
				case "checkbox":
					var elem = this.renderCheckbox(fld);
					break;
				default:
					var elem = this.renderOther(fld);
					break;
			}

			div.appendChild(elem);

			if (fld.message) {
				div.appendChild( <p class={ this.classValidationError }>{ this.i18n(fld.message) }</p> );
			}
			grid.appendChild(div);
			fieldset.appendChild(grid);
		}
		html.appendChild(fieldset);
	}

	return html;
}



/**
 * Validate entry of val into a single field, if valid call model.updateModel()
 *
 * If the field does not pass validation, then the fld.message element is updated
 * with an error message and false is returned.
 *
 * The model shall return true if the field is valid and update the model accordingly.
 *
 * @type boolean
 * @return true if field passed validation
 */
Form.validateField = function(fld, val, model) {
	var mval = val;

	switch(fld.type) {
		case "textarea":
		case "text":
			fld.value = val;
			if (fld.size && (val.length > fld.size)) {
				fld.message = "$error.invalid_length";
				return false;
			}
			if (fld.required && (val.match(/^\s*$/) != null)) {
				fld.message = "$error.field_empty";
				return false;
			}
			break;
		case "select":
			if (fld.multiselect) {
				if (val.length > 0) {
					var ids = val.split(",").map(Number);
				} else {
					var ids = [];
				}
			} else {
				var ids = [ parseInt(val) ];
			}

			for (var i = 0; i < fld.value.length; i++) {
				fld.value[i].selected = false;
			}

			for (var i = 0; i < ids.length; i++) {
				var id = ids[i];
				var found = false;

				for (var j = 0; j < fld.value.length; j++) {
					var entry = fld.value[j];

					if (entry.optgroup) {
						for (var k = 0; k < entry.value.length; k++) {
							var option = entry.value[k];
							if (option.id == id) {
								option.selected = true;
								found = true;
								break;
							}
						}
					} else {
						if (entry.id == id) {
							entry.selected = true;
							found = true;
							break;
						}
					}

					if (found) {
						break;
					}
				}

				if (!found) {
					GPSystem.log(GPSystem.ERROR, module.id, "Received invalid id " + id + " for select field " + fld.id);
					fld.message = "$error.invalid_data";
					return false;
				}
			}

			if (fld.multiselect) {
				mval = ids;
			} else {
				mval = ids[0];
			}
			break;
		case "number":
			fld.value = val;
			var mval = parseInt(val);

			if (isNaN(mval)) {
				fld.message = "$error.not_a_number";
				return false;
			}

			if ((typeof(fld.min) == "number") && (mval < fld.min)) {
				fld.message = "$error.too_small";
				return false;
			}

			if ((typeof(fld.max) == "number") && (mval > fld.max)) {
				fld.message = "$error.too_large";
				return false;
			}

			break;
		case "checkbox":
			if (val == "on") {
				mval = true;
			} else {
				mval = false;
			}
			break;
		// No Default to allow model to implement additional field types
	}

	if (!model.updateModel(fld, mval)) {
		return false;
	}

	return true;
}



/**
 * Set editable fields in the form with key:value pairs in the fields object
 *
 * @type boolean
 * @return true if field passed validation
 */
Form.prototype.setFields = function(fields, model) {

	//	for (var i in fields) {
	//		print("### " + i + " : " + fields[i]);
	//	}

	var valid = true;

	for (var fsi = 0; fsi < this.form.length; fsi++) {
		var fs = this.form[fsi];

		for (var fli = 0; fli < fs.fields.length; fli++) {
			var fld = fs.fields[fli];

			if (fld.editable) {
				var val = fields[fld.id];
				if (typeof(val) != "undefined") {
					if (!Form.validateField(fld, val, model)) {
						valid = false;
					}
				} else {
					if (fld.multiselect) {
						if (!Form.validateField(fld, "", model)) {
							valid = false;
						}
					} else if (fld.type == "checkbox") {
						// The value of an unchecked checkbox won't be submitted
						// by the browser
						if (!Form.validateField(fld, false, model)) {
							valid = false;
						}
					}
				}
			}
		}
	}
	return valid;
}
