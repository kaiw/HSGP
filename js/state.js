
var State = {

    fromInt : function(size, integer) {
        var state = new Array(size);
        for (var i = 0; i < size; i++) {
            state[i] = integer & (1 << (size - 1 - i));
        }
        return state;
    },

    asInt : function(state) {
        var integer = 0;
        for (var i = 0, len = state.length; i < len; ++i) {
            if (state[i]) {
                integer += 1 << (len - 1 - i);
            }
        }
        return integer;
    },

    neighbours : function(state) {
        var neighbours = new Array(state.length);
        for (var i = 0, len = state.length; i < len; ++i) {
            var neighbour = state.slice(0);
            neighbour[i] = !neighbour[i];
            neighbours[i] = neighbour;
        }
        return neighbours;
    },

    hamming : function(state1, state2) {
        if (state1.length != state2.length) {
            return; // FIXME: null?
        }
        var hamming = 0;
        for (var i = 0, len = state1.length; i < len; ++i) {
            hamming += (state1[i] == state2[i] ? 0 : 1);
        }
        return hamming;
    },

    toString : function(state) {
        var stateString = "";
        for (var i = 0, len = state.length; i < len; ++i) {
            stateString += (state[i] ? "1" : "0");
            if (i != state.length - 1)
                stateString += ",";
        }
        return stateString;
    }
};


function SchemaParseException(message) {
    this.message = message;
    this.name = "SchemaParseException";
}
SchemaParseException.prototype.toString = function () {
  return "Error parsing schema: " + this.message;
}



var Schema = {
    starIndices : function (schema) {
        var starIndices = [];
        for (var i = 0, len = schema.length; i < len; ++i) {
            if (schema[i] === "*") {
                starIndices.push(i);
            }
        }
        return starIndices;
    },

    states : function (schema) {
        var starIndices = Schema.starIndices(schema);
        var numStates = 1 << starIndices.length;
        var states = Array(numStates);
        for (var i = 0; i < numStates; ++i) {
            var fillValues = State.fromInt(starIndices.length, i);
            var state = new Array(schema.length);
            for (var j = 0, len = schema.length; j < len; ++j) {
                state[j] = schema[j] == "1";
            }
            for (var j = 0, len = starIndices.length; j < len; ++j) {
                state[starIndices[j]] = fillValues[j];
            }
            states[i] = state;
        }
        return states;
    },

    parseToValues : function (text) {
        var values = new Array();
        var lines = text.split("\n");
        var dims;

        // Check for a header
        if (lines[0][0] == "#") {
            var midSplit = line.split(":");
            if (midSplit.length != 2) {
                throw new SchemaParseException("Incorrect header syntax; see description");
            }
            var posterior = midSplit[1]
            var dimensions = midSplit[0].split(",");

            // FIXME: Do something with the header

            lines.splice(0, 1);
        }

        for (var i = 0, len = lines.length; i < len; ++i) {
            var line = lines[i];

            // Discard empty lines, e.g., EOF
            if (line.length == 0) {
                continue;
            }

            var midSplit = line.split(":");
            if (midSplit.length != 2) {
                throw new SchemaParseException("Incorrect schema syntax; see description");
            }

            // FIXME: We need to unify handling of categorical (e.g., integer) vs continuous (i.e., double) values
//            var value = parseInt(midSplit.pop(), 10);
            var value = parseFloat(midSplit.pop());
            var schema = midSplit[0].split(",");

            if (dims && dims != schema.length) {
                throw new SchemaParseException("Schemas are different lengths");
            }

            var states = Schema.states(schema);
            for (var j = 0, len2 = states.length; j < len2; ++j) {
                var stateInt = State.asInt(states[j]);
                if (values[stateInt] != undefined && values[stateInt] != value) {
                    throw new SchemaParseException("Multiple different values defined for state " + states[j]);
                }
                values[stateInt] = value;
            }
            dims = schema.length;
        }

        for (var i = 0, len = values.length; i < len; ++i) {
            if (values[i] == undefined) {
                throw new SchemaParseException("Value(s) left undefined; maybe schemas don't fully cover the space");
            }
        }

        return values;
    }
};
