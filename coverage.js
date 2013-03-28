
(function ($) {
    var FACTOR = 0.2;
    var TR_TEMPLATE = "<td class='{{ className }}'><a href='{{ href }}'>{{ name }}</a></td><td class=detailed-data>{{ normativeStatements }}</td><td class=detailed-data>{{ algorithmicSteps }}</td><td class=detailed-data>{{ idlComplexity }}</td><td class=detailed-data>{{ propdef }}</td><td>{{ existing }}</td><td>{{ desired }}</td><td>{{ percent }}</td><td><div class=progress-bar-container><div class=progress-bar></div></div></td>";
    var TABLE_TEMPLATE = "<div><h2>{{ title }}</h2><p></p><table data-id='{{ dataId }}' class='hide-details hide-reqs'><tr><th>Section</th><th class=detailed-data>Normative statements</th><th class=detailed-data>Algorithic steps</th><th class=detailed-data>WebIDL complexity</th><th class=detailed-data>Prop Defs</th><th>Existing Tests</th><th>Desired Tests</th><th>Coverage (%)</th><th>Graph</th></tr></table></div>";
    var SUMMARY_TEMPLATE = "There are <strong>{{ missingTests }} missing tests</strong>.<br>At <strong>${{ testCost }}</strong> per test and <strong>${{ reviewCost }}</strong> per test review, the overall estimated cost for outsourcing testing of this specification is: <strong>${{ totalCost }}</strong>.";
    
    var SUMMARY_TABLE_TEMPLATE = "<table><tr><th>Spec name</th><th>Existing Tests</th><th>Desired Tests</th><th>Coverage (%)</th><th>Graph</th></tr></table></div>";
    var SUMMARY_TR_TEMPLATE = "<tr><td><a href='{{ href }}'>{{ name }}</a></td><td>{{ existing }}</td><td>{{ desired }}</td><td>{{ percent }}</td><td><div class=progress-bar-container><div class=progress-bar></div></div></td></tr>"
    
    function formatNumber(num) {
      num = (num + "");
      if (num.length > 3) {
        num = num.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
      }
      return num;
    }
    
    var TEMPLATE_REGEXP = /{{\s*([a-z]+)\s*}}/ig;
    
    function microTemplate(str, obj) {
      return str.replace(TEMPLATE_REGEXP, function(_, key) {
        return obj[key] + '';
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
    
    function updateDataDisplay($tr, data) {
      $tr.html(microTemplate(TR_TEMPLATE, Object.keys(data).reduce(function(obj, k) {
            var v = data[k], t = typeof v;
            if (t == 'number') obj[k] = formatNumber(v);
            else if (v == null) obj[k] = 'n/a';
            else  obj[k] = v;
            return obj;
        }, {})));
      $tr.toggleClass('no-req', !data.desired);
      setColor($tr.find("td:nth-child(8)"), data.percent);
    }
    
    function updateDisplay($tr, data) {
      updateDataDisplay($tr, data);
      updateBarGraph($tr.find("td:nth-child(9)"), data.existing, data.desired);
    }
    
    function calculateSection(data, multipliers, specData) {
        var desired = formula(data, multipliers),
            existing = data.tests || 0;
        
        existing += Math.floor(multipliers.idlComplexity * data.idlComplexity * multipliers.assumeIdl / 100);
        
        if (data.level === 1) {
            // We make sure to count each missing test separately.
            // If not areas with too mnay tests would be complensating for areas with not enough tests.
            // Technically, we should really be looking at the leaves here.
            specData.missing += Math.max(0, desired - existing);
            specData.desired += desired;
            specData.existing += existing;
        }
        data.existing = existing;
        data.desired = desired;
        data.percent = calculatePercentage(existing, desired);
        return data;
    }
    
    function updateText($table, specData, multipliers) {
        $table.parent("div").find("> p").html(microTemplate(SUMMARY_TEMPLATE, {
            missingTests: formatNumber(specData.missing),
            testCost: multipliers.testCost,
            reviewCost: multipliers.reviewCost,
            totalCost: formatNumber((multipliers.testCost * specData.missing) + (multipliers.reviewCost * specData.missing))
        }));
    }
    
    $("input[name=level]").click(function () {
        var lvl = $(this).val();
        filterByLevel(lvl);
    });
    
    var curFilterLevel = 1;
    
    $("input[name=level][value=1]").attr("checked", "checked");
    
    filterByLevel(curFilterLevel);
    
    $("#update").click(function () {


        $("table").each(function () {
            var it = $('this').attr('data-id');
            var specData = {
                existing: 0,
                missing: 0,
                desired: 0
            };
            var multipliers = getMultipliers();
            $(this).find("tr").each(function () {
                var $tr = $(this);
                if ($tr.find("th").length) return;
                var data = JSON.parse($tr.data("raw"));
                data = calculateSection(data, multipliers, specData)
                updateDisplay($tr, data);
            });
            
            updateText($(this), specData, multipliers);
        });

    });
    
    $("#reqs-only").click(function() {
        $("table").toggleClass("hide-reqs", this.checked);
    });
    
    $("#show-details").click(function() {
        $("table").toggleClass("hide-details", !this.checked);
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
        output += data.propdef * multipliers.propdef;
        return output;
    }
    
    function getMultipliers() {
        return {
            normativeStatements: 1 * $("input[name=rfc2119]").val(),
            algorithmicSteps: 1 * $("input[name=algos]").val(),
            idlComplexity: 1 * $("input[name=idl]").val(),
            assumeIdl: 1 * $("input[name=assume-idl]").val(),
            reviewCost: 1 * $("input[name=review-cost]").val(),
            testCost: 1 * $("input[name=test-cost]").val(),
            propdef: 1 * $("input[name=propdef]").val()
        };
    }
    
    function buildTable(spec, specData, $target) {
        
    }
    
    window.cover = function (specs, $target) {
      //$summary = $(microTemplate(SUMMARY_TABLE_TEMPLATE, {}));
      //$target.append($summary);
      specs.forEach(function(spec) {
          var it = spec.shortName
          ,   tit = spec.title
          ,   base = spec.href
          ,   $div
          ,   $table
          ,   multipliers = getMultipliers()
          ;
          $.getJSON("spec-data-" + it + ".json", function (data) {


            $div = $(microTemplate(TABLE_TEMPLATE, {
              title: tit,
              dataId: it
            }));

            $target.append($div);
            $table = $div.find('table');
            var specData = {
                existing: 0,
                missing: 0,
                desired: 0
            };
            for (var i = 0, n = data.length; i < n; i++) {
                var row = data[i], $tr = $('<tr></tr>');
                
                row.className = "level" + row.level;
                if (row.url) {
                    row.href = row.url;
                } else {
                    row.href = base + '#' + row.original_id;
                }
                row.name = row.original_id;
                $tr.data("raw", JSON.stringify(row));
                row = calculateSection(row, multipliers, specData);
                updateDisplay($tr, row);
                updateText($table, specData, multipliers);
                
                $table.append($tr);
            }
            //$summary.append$(microTemplate(SUMMARY_TR_TEMPLATE, specData));
        });
      });
    };
}(jQuery));

