
(function ($) {
    var FACTOR = 0.2;
    function formatNumber(num) {
      num = (num + "");
      if (num.length > 3) {
        num = num.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
      }
      return num;
    }
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
            var it = $('this').attr('data-id');
            var missing = 0;
            var multipliers = getMultipliers();
            $(this).find("tr").each(function () {
                var totalDesired = 0,
                    totalExisting = 0;
                var $tr = $(this);
                if ($tr.find("th").length) return;
                var data = JSON.parse($tr.data("raw"));
                var requirements = formula(data, multipliers);
                $tr.find("td:nth-child(3)").text(requirements);
                var existing = data.tests;
                if (multipliers.assumeIdl) existing += multipliers.idlComplexity * data.idlComplexity;
                $tr.find("td:nth-child(2)").text(existing);
                missing += Math.max(0, requirements - existing);
                var percent = calculatePercentage(existing, requirements);
                $tr.find("td:nth-child(4)").text(percent === null ? 'n/a' : percent);
                setColor($tr.find("td:nth-child(4)"), percent);
                var $lastTD = $tr.find("td:nth-child(5)");
                $lastTD.css("width", (requirements * FACTOR) + "px");
                var $div = $lastTD.find("> div");
                var $div2 = $div.find("div");
                $div.css("width", ((requirements * FACTOR) + 2) + "px");
                $div2.css("width", (Math.min(existing, requirements) * FACTOR) + "px");
            });
            var text = "There are <strong>" + formatNumber(missing) + " missing tests</strong>.<br>";
            text += "At <strong>$" + multipliers.testCost + "</strong> per test and <strong>$" + multipliers.reviewCost + "</strong> per test review, ";
            text += "the overall estimated cost for outsourcing testing of this specification is: <strong>$";
            text += formatNumber((multipliers.testCost * missing) + (multipliers.reviewCost * missing));
            text += "</strong>.";
            $(this).parent("div").find("> p").html(text);
        });

    });
    
    $("#reqs-only").click(function() {
        $("table").toggleClass("hide-reqs", this.checked);
    });
    
    $("#assume-idl").click(function() {
        $("#update").click();
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
            idlComplexity: 1 * $("input[name=idl]").val(),
            assumeIdl: $("input[name=assume-idl]").is(':checked'),
            reviewCost: 1 * $("input[name=review-cost]").val(),
            testCost: 1 * $("input[name=test-cost]").val()
        };
    }
    
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

            $table.attr('data-id', it);
            $("<tr><th>Section</th><th>Existing Tests</th><th>Desired Tests</th><th>Coverage (%)</th></tr>")
                .appendTo($table);

            $div.append($("<h2></h2>").text(tit));
            $div.append($("<p></p>"));
            $div.append($table);

            $target.append($div);
            $.getJSON("spec-data-" + it + ".json", function (data) {
                for (var i = 0, n = data.length; i < n; i++) {
                    var row = data[i]
                    ,   $tr = $("<tr></tr>")
                    ;
                    
                    $tr.data("raw", JSON.stringify(row))
                    var $first = $("<td></td>").addClass("level" + row.level);
                    $("<a></a>").attr("href", base + '#' + row.original_id).text(row.original_id).appendTo($first);
                    $first.appendTo($tr);
                    $("<td></td>").text(row.tests).appendTo($tr);
                    var multipliers = getMultipliers();
                    var requirements = formula(row, multipliers);
                    $("<td></td>").text(requirements).appendTo($tr);
                    var percent = calculatePercentage(row.tests, requirements);
                    $("<td></td>").text(percent === null ? 'n/a' : percent).appendTo($tr);
                    var $lastTD = $("<td></td>")                    
                    var $div = $("<div></div>");
                    var $div2 = $("<div></div>");
                    $lastTD.append($div);
                    $div.append($div2);
                    $div2.css("height", "10px");
                    $div2.css("margin", "1px");
                    $div2.css("background-color", "#666");
                    $div.css("border", "1px solid black");
                    $lastTD.appendTo($tr);
                    if (!requirements) $tr.addClass('no-req')
                    $table.append($tr);

                }
                
                process();
            });
        }
        process();
    };
}(jQuery));

