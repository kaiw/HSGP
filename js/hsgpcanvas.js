var hsgp;
var statusTimeoutId;

function setup () {
    hsgp = new HSGPCanvas($("#HSGPCanvas")[0]);
    statusTimeoutId = null;

    function addSchemaLink (file, label, where) {
        var link = "javascript:loadSchemaFile('schemas/" + file + ".schema'); return false;";
        var whole = "<a href=\"#\" onclick=\"" + link + "\">" + label + "</a><br>";
        $(where).append(whole);
    }


    addSchemaLink("growthAttractor9", "Attractor 9 states", "#GrowthSelector");
    addSchemaLink("growthAttractor37", "Attractor 37 states", "#GrowthSelector");
    addSchemaLink("growthAttractor93", "Attractor 93 states", "#GrowthSelector");
    addSchemaLink("growthBasin9", "Basin 9 states", "#GrowthSelector");
    addSchemaLink("growthBasin37", "Basin 37 states", "#GrowthSelector");
    addSchemaLink("growthBasin93", "Basin 93 states", "#GrowthSelector");

    addSchemaLink("DrosophilaPruned", "Drosophila (pruned)", "#DrosYeastSelector");
    addSchemaLink("Yeast", "Yeast", "#DrosYeastSelector");

    $("#HSGPCanvas").click(function (event) {
        var element = $(this);
        var offset = element.offset();
        var paddingLeft = parseInt(element.css("paddingLeft"), 10) || 0;
        var paddingTop = parseInt(element.css("paddingTop"), 10) || 0;
        var x = Math.floor(event.pageX - offset.left - paddingLeft);
        var y = Math.floor(event.pageY - offset.top - paddingTop);
        if (x < 0 || y < 0 || x > element.width() || y > element.height()) {
            return;
        }

        var selected = hsgp.canvasToLayout({"x" : x, "y" : y});
        hsgp.setSelectedPoint(selected);
        selectedChanged();
    });

    // TODO: Live-resizing could be very slow for high-dimensional canvases.
    // It might be better to throttle the canvasSizeChanged() call.
    var element = $("#HSGPCanvas");
    $(window).resize(function(){
        var container_width = $("#CanvasContainer").width();
        element[0].width = container_width;
        element[0].height = container_width;
        hsgp.canvasSizeChanged();
    });
    $(window).resize();
}

function selectedChanged() {
    var selectedState = hsgp.getSelectedState();
    var neighbours;
    if (selectedState === null) {
        neighbours = [];
        $("#SelectedStateLabel").html("None");
    }
    else {
        neighbours = State.neighbours(selectedState);
        $("#SelectedStateLabel").html("[" + State.toString(selectedState) + "]");
    }
    hsgp.updateHighlights(neighbours);
    hsgp.draw();
}

function setStatus(msg, cls) {
    if (statusTimeoutId !== null) {
        clearTimeout(statusTimeoutId);
        statusTimeoutId = null;
    }
    var status = $("#Status");
    status.stop(false, true); // FIXME: what?
    status.removeClass("alert-success alert-error").addClass(cls);
    $("#StatusLabel").html(document.createTextNode(msg));
    status.fadeIn("normal");
    statusTimeoutId = setTimeout(function () {statusTimeoutId = null; status.fadeOut("normal");}, 3000);
    // FIXME: if it times out, it re-shows properly. If it's manually dismissed, it never comes back
}

function loadSchemaFile(file) {
    var timestamp = (new Date()).getTime();
    jQuery.get(file, {"t" : timestamp}, loadSchemaFileCallback, "text");
}

function loadSchemaFileCallback(data) {
    Schema.parseToValues(data, function (err, result) {
        if (err) {
            setStatus(err, "alert-error");
            return;
        }
        setStatus("Schema loaded", "alert-success");
        hsgp.updateStateValues(result);
        hsgp.setSelectedPoint(null);
        selectedChanged();
    });
}
