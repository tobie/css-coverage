
(function ($) {
    
    function filterByLevel (lvl) {
        var mask;
        if (lvl == 1) mask = ["show", "hide", "hide"];
        else if (lvl == 2) mask = ["show", "show", "hide"];
        else if (lvl == 3) mask = ["show", "show", "show"];
        else alert("Beuargh");
        for (var i = 0, n = mask.length; i < n; i++) {
            var action = mask[i];
            $("td.level" + (i + 1)).parent()[action]();
        }
    }
    $("input[name=level]").click(function () {
        var lvl = $(this).val();
        filterByLevel(lvl);
        localStorage.setItem("filterLevel", lvl);
    });
    var curFilterLevel = localStorage.getItem("filterByLevel") || 3;
    $("input[name=level][value=" + curFilterLevel + "]").attr("checked", "checked");
    filterByLevel(curFilterLevel);
    
    $("#update").click(function () {
        var words = 1 * $("input[name=words]").val()
        ,   rfc2119 = 1 * $("input[name=rfc2119]").val()
        ,   algos = 1 * $("input[name=algos]").val()
        ,   idl = 1 * $("input[name=idl]").val()
        ;

        function setColor(element, percent) {
            if (percent == null) color = '#fff'
            else if (percent > 79) color = '#0f0'
            else if (percent > 59) color = '#cf6'
            else if (percent > 39) color = '#ff6'
            else if (percent > 19) color = '#fc6'
            else color = '#f00'
            element.css("background", color);
        }

        $("table").each(function () {
            $(this).find("tr").each(function () {
                var $tr = $(this);
                if ($tr.find("th").length) return;
                var data = rawData[$tr.find("td").first().text()];
                var requirements = formula(data, getMultipliers());
                $tr.find("td:nth-child(3)").text(requirements);
                var percent = calculatePercentage(data.tests, requirements);
                $tr.find("td:nth-child(4)").text(percent === null ? 'n/a' : percent);
                setColor($tr.find("td:nth-child(4)"), percent)
            });
        });

    });
    
    function calculatePercentage(existing, desired) {
        if (!desired) {
            return null;
        }
        return Math.min(Math.round((existing / desired) * 100), 100);
    }
    
    function formula(data, multipliers) {
        var output = 0;
        output += data.normativeStatements * multipliers.normativeStatements;
        output += data.algorithmicSteps * multipliers.algorithmicSteps;
        output += data.idlComplexity * multipliers.idlComplexity;
        return output;
    }
    
    function getMultipliers() {
        return {
            normativeStatements: 1 * $("input[name=rfc2119]").val(),
            algorithmicSteps: 1 * $("input[name=algos]").val(),
            idlComplexity: 1 * $("input[name=idl]").val()
        };
    }
    
    window.rawData = {};
    
    window.cover = function (items, titles, urls, $target) {
        function process () {
            if (!items.length) {
                $("#update").click();
                return;
            }
            var it = items.shift()
            ,   tit = titles.shift()
            ,   base = urls.shift()
            ,   $div = $("<div></div>")
            ,   $table = $("<table></table>")
            ;

            $("<tr><th>Section</th><th>Existing Tests</th><th>Desired Tests</th><th>Coverage (%)</th></tr>")
                .appendTo($table);

            $div.append($("<h2></h2>").text(tit));
            $.getJSON("spec-data-" + it + ".json", function (data) {
                for (var i = 0, n = data.length; i < n; i++) {
                    var row = data[i]
                    ,   $tr = $("<tr></tr>")
                    ;
                    
                    window.rawData[row.original_id] = row;
                    var $first = $("<td></td>").addClass("level" + row.level);
                    $("<a></a>").attr("href", base + '#' + row.original_id).text(row.original_id).appendTo($first);
                    $first.appendTo($tr);
                    $("<td></td>").text(row.tests).appendTo($tr);
                    var requirements = formula(row, getMultipliers());
                    $("<td></td>").text(requirements).appendTo($tr);
                    $("<td></td>").text(calculatePercentage(row.tests, requirements)).appendTo($tr);
                    $table.append($tr);

                }
                $div.append($table);

                $target.append($div);
                process();
            });
        }
        process();
    };
}(jQuery));

