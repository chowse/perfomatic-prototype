$(function () {
	
	function parseDate(t) {
        var year = parseInt(t.substring(0,4), 10);
        var month = parseInt(t.substring(5,7), 10);
        var day = parseInt(t.substring(8,10), 10);
        var hour = parseInt(t.substring(11,13), 10);
        var min = parseInt(t.substring(14,16), 10);
        var sec = parseInt(t.substring(17,19), 10);
		var date = new Date(year,month,day,hour,min,sec);
		var time = date.getTime();
		return time;
	}

	function parseData(test, platform, data) {
		var changesets = data.changesets;
		var runs = calcRuns(data.series, changesets);
		var mean = calcMean(runs, changesets);
		var maxima = calcMaxima(runs);

		return {
			"test": test,
			"platform": platform,
			"runs": runs,
			"mean": mean,
			"minT": maxima.minT,
			"minV": maxima.minV,
			"maxT": maxima.maxT,
			"maxV": maxima.maxV
		};
	}
	
	function calcRuns(series, changesets)
	{
		return $.map(series, function(s0, si) {
			return {
				'machine': 'machine-' + (si+1),
				'data': $.map(s0.data, function(p0, pi) {
					return {
						"t": parseDate(p0[0]),
						"v": p0[1],
						"changeset": changesets[pi]
					};
				})
			};
		});
	}
	
	function calcMean(runs, changesets)
	{
		"(a-b)^2 = a^2 - 2ab + b^2";
		
		var csData = { };
		$.each(changesets, function(i, cs) {
			csData[cs] = { tSum: 0, vSum: 0, count: 0 };
		});
		$.each(runs, function(i, s) {
			$.each(s.data, function(i, p) {
				var csd = csData[p.changeset];
				csd.tSum += p.t;
				csd.vSum += p.v;
				csd.count++;
			});
		});
		var result = [ ];
		$.each(csData, function(cs, csd) {
			if (csd.count) {
				result.push({ "t": parseInt(csd.tSum/csd.count), "v": csd.vSum/csd.count, "changeset": cs })
			}
		});
		result.sort(function(a, b) {
			return a.t - b.t;
		});
		
		return result;
	}
	
	function calcMaxima(runs)
	{
		var ts = [ ], vs = [ ];
		var minT = Number.POSITIVE_INFINITY, minV = Number.POSITIVE_INFINITY;
		var maxT = Number.NEGATIVE_INFINITY, maxV = Number.NEGATIVE_INFINITY;
		
		$.each(runs, function(i, run) {
			$.each(run.data, function(j, p) {
				ts[ts.length] = p.t;
				vs[vs.length] = p.v;
			});
		});
		
		return {
			minT: Math.min.apply(null, ts),
			minV: Math.min.apply(null, vs),
			maxT: Math.max.apply(null, ts),
			maxV: Math.max.apply(null, vs)
		};
	}
	
    $.getJSON('data/input1.json', function(data) {
		$('#json').val('');
		setTimeout(function() {
			var result = parseData('Ts', 'Vista', data);
			$('#json').val( JSON.stringify(result) );
		}, 0);
    });
	
});