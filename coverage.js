
(function ($) {
    var FACTOR = 0.2;
    var TR_TEMPLATE = "<tr><td class='{{ className }}'><a href='{{ href }}'>{{ name }}</a></td><td class=detailed-data></td><td class=detailed-data></td><td class=detailed-data></td><td></td><td></td><td></td><td><div class=progress-bar-container><div class=progress-bar></div></div></td></tr>";
    var TABLE_TEMPLATE = "<div><h2>{{ title }}</h2><p></p><table data-id='{{ dataId }}' class=hide-details><tr><th>Section</th><th class=detailed-data>Normative statements</th><th class=detailed-data>Algorithic steps</th><th class=detailed-data>WebIDL complexity</th><th>Existing Tests</th><th>Desired Tests</th><th>Coverage (%)</th><th>Graph</th></tr></table></div>";
    var SUMMARY_TEMPLATE = "There are <strong>{{ missingTests }} missing tests</strong>.<br>At <strong>${{ testCost }}</strong> per test and <strong>${{ reviewCost }}</strong> per test review, the overall estimated cost for outsourcing testing of this specification is: <strong>${{ totalCost }}</strong>.";
    
    function formatNumber(num) {
      if (num == null) {
        return "n/a"
      }
      num = (num + "");
      if (num.length > 3) {
        num = num.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
      }
      return num;
    }
    
    var TEMPLATE_REGEXP = /{{\s*([a-z]+)\s*}}/ig;
    
    function microTemplate(str, obj) {
      return str.replace(TEMPLATE_REGEXP, function(_, key) {
        return obj[key] || '';
      });
    }
    
    function setColor(element, percent) {
        var color;
        if (percent == null) color = 'transparent'
        else if (percent > 79) color = '#0f0'
        else if (percent > 59) color = '#cf6'
        else if (percent > 39) color = '#ff6'
        else if (percent > 19) color = '#fc6'
        else color = '#f00'
        element.css("background", color);
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
    
    function updateBarGraph($td, existing, desired) {
      var $container = $td.find("> div");
      var $bar = $container.find("div");
      $container.css("width", ((desired * FACTOR) + 2) + "px");
      $bar.css("width", (Math.min(existing, desired) * FACTOR) + "px");
    }
    
    function updateCell($tr, index, num) {
      $tr.find("td:nth-child(" + index + ")").text(formatNumber(num));
    }
    
    function updateDataDisplay($tr, data, existing, desired) {
      $tr.toggleClass('no-req', !desired);
      updateCell($tr, 2, data.normativeStatements);
      updateCell($tr, 3, data.algorithmicSteps);
      updateCell($tr, 4, data.idlComplexity);
      updateCell($tr, 5, existing);
      updateCell($tr, 6, desired);
      var percent = calculatePercentage(existing, desired);
      setColor($tr.find("td:nth-child(7)"), percent);
      updateCell($tr, 7, percent);
    }
    
    function updateDisplay($tr, data, existing, desired) {
      updateDataDisplay($tr, data, existing, desired);
      updateBarGraph($tr.find("td:nth-child(8)"), existing, desired);
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


        $("table").each(function () {
            var it = $('this').attr('data-id');
            var missing = 0;
            var multipliers = getMultipliers();
            $(this).find("tr").each(function () {
                var $tr = $(this);
                if ($tr.find("th").length) return;
                var totalDesired = 0,
                    totalExisting = 0,
                    data = JSON.parse($tr.data("raw")),
                    requirements = formula(data, multipliers),
                    existing = data.tests,
                    percent;
                
                if (multipliers.assumeIdl) existing += multipliers.idlComplexity * data.idlComplexity;
                if (data.level === 1) missing += Math.max(0, requirements - existing);
                percent = calculatePercentage(existing, requirements);
                
                updateDisplay($tr, data, existing, requirements);
            });

            $(this).parent("div").find("> p").html(microTemplate(SUMMARY_TEMPLATE, {
              missingTests: formatNumber(missing),
              testCost: multipliers.testCost,
              reviewCost: multipliers.reviewCost,
              totalCost: formatNumber((multipliers.testCost * missing) + (multipliers.reviewCost * missing))
            }));
        });

    });
    
    $("#reqs-only").click(function() {
        $("table").toggleClass("hide-reqs", this.checked);
    });
    
    $("#show-details").click(function() {
        $("table").toggleClass("hide-details", !this.checked);
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
    
    window.cover = function (specs, $target) {
      specs.forEach(function(spec) {
        var it = spec.shortName
        ,   tit = spec.title
        ,   base = spec.url
        ,   $div
        ,   $table
        ;
        
        $div = $(microTemplate(TABLE_TEMPLATE, {
          title: tit,
          dataId: it
        }));
        
        $target.append($div);
        $table = $div.find('table');
        $.getJSON("spec-data-" + it + ".json", function (data) {
            for (var i = 0, n = data.length; i < n; i++) {
                var row = data[i], $tr;
                var str = microTemplate(TR_TEMPLATE, {
                  className: "level" + row.level,
                  href: base + '#' + row.original_id,
                  name: row.original_id
                });
                $tr = $(str);
                $tr.data("raw", JSON.stringify(row));
                $table.append($tr);
            }
        });
      });
      $("#update").click();
    };
}(jQuery));

