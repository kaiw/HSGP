
function setup () {
    var hsgp = new HSGPCanvas($("#HSGPCanvas")[0], $("#SelectedStateLabel"));
    var status = new StatusMessage($("#Status"), $("#StatusLabel"));

    function loadSchemaFileCallback(data) {
        Schema.parseToValues(data, function (err, result) {
            if (err) {
                setStatus(err, "alert-error");
                return;
            }
            status.setStatus("Schema loaded", "alert-success");
            hsgp.updateStateValues(result);
            hsgp.setSelectedPoint(null);
        });
    }


    function addSchemaLink (file, label, where) {
        var path = "schemas/" + file + ".schema";
        $("<a href='#'>" + label + "</a><br />")
                .appendTo(where)
                .click(function (e) {
            var timestamp = (new Date()).getTime();
            $.get(path, {"t" : timestamp}, loadSchemaFileCallback, "text");
            return false;
        });
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


function StatusMessage(el, label) {
    this._init(el, label);
}

StatusMessage.prototype = {

    _init: function (el, label) {
        this.el = el;
        this.label = label;
    },

    setStatus: function (msg, cls) {
        if (this.statusTimeoutId) {
            clearTimeout(this.statusTimeoutId);
            this.statusTimeoutId = null;
        }
        this.el.stop(false, true);
        this.el.removeClass("alert-success alert-error").addClass(cls);
        this.label.html(document.createTextNode(msg));
        this.el.fadeIn("normal");

        var that = this;
        this.statusTimeoutId = setTimeout(function () {
                that.statusTimeoutId = null;
                that.el.fadeOut("normal");
            }, 2000);
    }
};