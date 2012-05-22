"use strict";

var State = {

    fromInt : function(size, integer) {
        var state = new Array(size),
            i = 0;
        for (i = 0; i < size; i++) {
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
            return;
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



var Schema = {

    starIndices : function (schema) {
        var starIndices = [];
        _.each(schema, function (element, index, list) {
            if (element === "*") {
                starIndices.push(index);
            }
        });
        return starIndices;
    },

    states : function (schema) {
        var starIndices = Schema.starIndices(schema);
        var schemaLength = schema.length;
        var wildcards = starIndices.length;

        var states = _.map(_.range(1 << wildcards), function (index) {
            var j;
            var fillValues = State.fromInt(wildcards, index);
            var state = new Array(schemaLength);
            for (j = 0; j < schemaLength; ++j) {
                state[j] = schema[j] == "1";
            }
            for (j = 0; j < wildcards; ++j) {
                state[starIndices[j]] = fillValues[j];
            }
            return state;
        });
        return states;
    },

    parseToValues : function (text, callback) {
        var dims;
        var values = [];
        var lines;

        lines = text.split("\n");
        lines = _.filter(lines, function (l) { return l.length !== 0; });

        // Check for a header
        if (lines[0][0] == "#") {
            var midSplit = lines[0][0].split(":");
            if (midSplit.length != 2) {
                return callback("Incorrect header syntax", null);
            }
            var posterior = midSplit[1];
            var dimensions = midSplit[0].split(",");

            // FIXME: Do something with the header

            lines.splice(0, 1);
        }


        // Parse the space body; one schema per line
        _.each(lines, function (line, index, list) {

            var midSplit = line.split(":");
            if (midSplit.length != 2) {
                return callback("Incorrect schema syntax", null);
            }

            // FIXME: We need to unify handling of categorical (e.g., integer) vs continuous (i.e., double) values
            var schema = midSplit[0].split(",");
//            var value = parseInt(midSplit.pop(), 10);
            var value = parseFloat(midSplit[1]);

            if (!dims) {
                dims = schema.length;
            } else if (dims != schema.length) {
                return callback("Error parsing schema: Schemas have different lengths", null);
            }

            _.each(Schema.states(schema), function (state, index, list) {
                var stateInt = State.asInt(state);
                if (values[stateInt] !== undefined && values[stateInt] !== value) {
                    return callback("Multiple different values defined for state " + state, null);
                }
                values[stateInt] = value;
            });
        });

        if (_.any(values, _.isUndefined)) {
            return callback("Value(s) left undefined; maybe schemas don't fully cover the space", null);
        }

        return callback(null, values);
    }
};

