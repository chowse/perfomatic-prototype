(function($) {


	$.fn.selectBox = function() {
		var sync = function(e) {
			var sel = $('option:selected', this).html();
			$(this).parent().find('span').html(sel);
		};
		
		var selects = this.find('select');
		this.prepend('<span></span>');
		selects.each(sync);
		selects.focus(function(e) { $(this).parent().addClass('sbFocus'); });
		selects.blur(function(e) { $(this).parent().removeClass('sbFocus'); });
		selects.change(sync);
		
		return this;
	};
	
	
	$.fn.showBubble = function(anchor) {
		anchor = $(anchor);
		var offset = anchor.offset(),
		    w = anchor.outerWidth(),
		    h = anchor.outerHeight(),
		    bubbleWrap = this.find('.bubble-wrap');
		
		bubbleWrap.css({ left: offset.left+w/2, top: offset.top+h });
		
		return this
			.bind('click.bubble', onClickBubble)
			.bind('copy.bubble', onCopyBubble)
			.show();
		
		function onClickBubble(e) {
			if ( bubbleWrap.has(e.target).length == 0 ) {
				$(this).hideBubble();
				return false;
			}
		}
		
		function onCopyBubble(e) {
			if ( $(e.target).closest('input,textarea').length ) {
				var self = $(this);
				setTimeout(function() { self.hideBubble(); }, 100);
			}
		}
	};

	$.fn.hideBubble = function(anchor) {
		return this
			.unbind('click.bubble')
			.unbind('copy.bubble')
			.hide();
	};


	var COLORS = [ '#e7454c', '#6dba4b', '#4986cf', '#f5983d', '#884e9f', '#bf5c41', '#e7454c' ]
	var LIGHT_COLORS = $.map(COLORS, function(color) {
		return $.color.parse(color).add('a', -.5).toString();
	});

	var PLOT_OPTIONS = {
		xaxis: { mode: "time" },
		selection: { mode: "x", color: '#97c6e5' },
		/* crosshair: { mode: 'xy', color: '#cdd6df', lineWidth: 1 }, */
		series: { shadowSize: 0 },
		lines: { show: true },
		grid: { 
			color: '#cdd6df',
			borderWidth: 2,
			backgroundColor: '#fff',
			hoverable: true,
			clickable: true,
			autoHighlight: false
		}
	};
	
	var OVERVIEW_OPTIONS = {
		xaxis: { mode: 'time' },
		selection: { mode: "x", color: '#c9e2f2' },
		series: {
			lines: { show: true, lineWidth: 1 },
			shadowSize: 0
		},
		grid: {
			color: '#cdd6df',
			borderWidth: 2,
			backgroundColor: '#fff',
			tickColor: 'rgba(0,0,0,0)'
		},
	};
	
	
	var plot, overview, ajaxSeries;
	var _zoomFrom, _zoomTo;

	function init()
	{
		$('.selectBox').selectBox();
		
		initPlot();
		
	    $.getJSON('chart_demo/data/output1.json', function(data) {
			initData(data);
			initBindings();
			updatePlot(true);
	    });
	}

	function initPlot()
	{
		plot = $.plot($('#plot'), [ ], PLOT_OPTIONS);
		overview = $.plot($('#overview'), [ ], OVERVIEW_OPTIONS);
	}
	
	function initData(data)
	{
		ajaxSeries = data;
		ajaxSeries.exploded = false;
		ajaxSeries.visible = true;
	}
	
	function initBindings()
	{
		$('#plot').bind('plothover', onPlotHover);
		$('#plot').bind('plotclick', onPlotClick);
		$('#plot').bind('plotselected', onPlotSelect);
		$('#overview').bind('plotselected', onOverviewSelect);
		$('#overview').bind('plotunselected', onOverviewUnselect);

		$('#explode, #implode').click(onExplode);
		$('#show, #hide').click(onShow);
		
		$('#zoomin').click(onZoomInClick);
		$('#zoomout').click(onZoomOutClick);
		
		$(document).keydown(onPageKeyDown);
		$(window).resize(onResize);
	}

	function updatePlot(layout)
	{
		var plotData = parseSeries(ajaxSeries, 0, 3, 1),
		    overviewData = parseSeries(ajaxSeries, 0, 1, .5);

		var minV = ajaxSeries.minV,
		    maxV = ajaxSeries.maxV,
		    marginV = 0.1 * (maxV - minV),
		    minT = _zoomFrom || ajaxSeries.minT,
		    maxT = _zoomTo || ajaxSeries.maxT;

		var xaxis = { xaxis: { min: minT, max: maxT } },
		    yaxis = { yaxis: { min: minV-marginV, max: maxV+marginV } },
		    plotOptions = $.extend(true, { }, PLOT_OPTIONS, xaxis, yaxis),
		    overviewOptions = $.extend(true, { }, OVERVIEW_OPTIONS, yaxis);
		
		plot = $.plot($('#plot'), plotData, plotOptions);
		overview = $.plot($('#overview'), overviewData, overviewOptions);
	}
	
	function getZoomRange()
	{
		return {
			from: _zoomFrom || ajaxSeries.minT,
			to: _zoomTo || ajaxSeries.maxT 
		};
	}
	
	function zoomIn()
	{
		var sel = plot.getSelection();
		
		if (sel && sel.xaxis) {
			var range = sel.xaxis;
			plot.clearSelection(true);
		} else {
			var oldRange = getZoomRange();
			var range = {
				from: oldRange.from + (oldRange.to - oldRange.from)/4,
				to: oldRange.from + 3*(oldRange.to - oldRange.from)/4
			}
		}
		
		zoomTo(range);
	}
	
	function zoomOut()
	{
		var oldRange = getZoomRange();
		
		var range = {
			from: oldRange.from - (oldRange.to - oldRange.from)/2,
			to: oldRange.from + 3*(oldRange.to - oldRange.from)/2
		}
		
		var dt = 0;
		if (range.from < ajaxSeries.minT) { dt = ajaxSeries.minT - range.from; }
		else if (range.to > ajaxSeries.maxT) { dt = ajaxSeries.maxT - range.to; }
		
		range.from = Math.max(range.from + dt, ajaxSeries.minT);
		range.to = Math.min(range.to + dt, ajaxSeries.maxT);

		zoomTo(range);
	}
	
	function zoomTo(range)
	{
		_zoomFrom = (range && range.from) || ajaxSeries.minT;
		_zoomTo = (range && range.to) || ajaxSeries.maxT;
		
		unlockTooltip();
		hideTooltip(true);
		updatePlot();
		
		if (ajaxSeries.minT < _zoomFrom || _zoomTo < ajaxSeries.maxT) {
			overview.setSelection({ xaxis: { from: _zoomFrom, to: _zoomTo } }, true);
			var canZoomOut = true;
		} else {
			overview.clearSelection(true);
			var canZoomOut = false;
		}

		$('#zoomout').toggleClass('disabled', !canZoomOut);
	}
	
	function onPageKeyDown(e)
	{
		switch (e.keyCode) {
		case 107: /* + */
			zoomIn();
			return false;
		case 109: /* - */
			zoomOut();
			return false;
		}
	}
	
	function onZoomInClick()
	{
		zoomIn();
		return false;
	}
	
	function onZoomOutClick()
	{
		zoomOut();
		return false;
	}

	var _loadExplodeTimeout;
	
	function onExplode(e)
	{
		var loading = !!_loadExplodeTimeout;
		
		clearTimeout(_loadExplodeTimeout);
		_loadExplodeTimeout = false;
		
		if (loading || ajaxSeries.exploded) {
			$('#series').removeClass('exploded explode-loading');
			ajaxSeries.exploded = false;
			setExploded(false);
		} else {
			$('#series').addClass('exploded explode-loading');
			_loadExplodeTimeout = setTimeout(function() {
				setExploded(true);
			}, 1000);
		}
		
		return false;
		
		function setExploded(exploded) {
			$('#series')
				.removeClass('explode-loading')
				.toggleClass('exploded', exploded);
			
			ajaxSeries.exploded = exploded;
		
			unlockTooltip();
			hideTooltip();
			updatePlot();
		}
	}
	
	function onShow(e)
	{
		ajaxSeries.visible = !ajaxSeries.visible;
		$('#series').toggleClass('hidden', !ajaxSeries.visible);

		unlockTooltip();
		hideTooltip();
		updatePlot();

		e.preventDefault();
	}

	var prevSeriesIndex = -1,
	    prevDataIndex = -1;
	
	function onPlotHover(e, pos, item)
	{
		$('#plot').css({ cursor: item ? 'pointer' : 'crosshair' });

		if (item) {
			if (item.seriesIndex != prevSeriesIndex || item.dataIndex != prevDataIndex) {
				updateTooltip(item);
				showTooltip(item.pageX, item.pageY);
				prevSeriesIndex = item.seriesIndex;
				prevDataIndex = item.dataIndex;
			}
		} else {
			hideTooltip();
			prevSeriesIndex = -1;
			prevDataIndex = -1;
		}
	}
	
	function onPlotClick(e, pos, item)
	{
		unlockTooltip();
		
		if (item) {
			updateTooltip(item);
			showTooltip(item.pageX, item.pageY);
			lockTooltip();
		} else {
			hideTooltip(true);
		}
	}
	
	function onPlotSelect(e, ranges)
	{
/*
		_zoomFrom = ranges.xaxis.from;
		_zoomTo = ranges.xaxis.to;

		unlockTooltip();
		hideTooltip(true);
		updatePlot();
		
		plot.clearSelection(true);
		overview.setSelection(ranges, true);
*/
	}
	
	function onOverviewSelect(e, ranges)
	{
		plot.clearSelection(true);
		zoomTo(ranges.xaxis);
	}
	
	function onOverviewUnselect(e)
	{
		zoomTo(null);
	}
	
	var resizeTimer = null;
	
	function onResize()
	{
		if (!resizeTimer) {
			resizeTimer = setTimeout(function() {
				updatePlot();
				resizeTimer = null;
			}, 50);
		}
	}
	
	function parseSeries(seriesIn, i, weight, explodedWeight)
	{
		if (!seriesIn.exploded) {
			var color = COLORS[i % COLORS.length];
			var datasets = [{ data: seriesIn.mean }];
			var lineWidth = seriesIn.visible ? weight : 0;
		}
		
		else {
			var color = LIGHT_COLORS[i % LIGHT_COLORS.length];
			var datasets = seriesIn.runs;
			var lineWidth = seriesIn.visible ? explodedWeight : 0;
		}

		return $.map(datasets, function(d) {
			return {
				lines: { lineWidth: lineWidth },
				color: color,
				data: $.map(d.data, function(p) { return [[ p.t, p.v ]]; }),
				etc: {
					branch: seriesIn.branch,
					test: seriesIn.test,
					platform: seriesIn.platform,
					machine: d.machine,
					changesets: $.map(d.data, function(p) { return p.changeset; })
				}
			};
		});
	}


	var ttHideTimer = null,
	    ttLocked = false;
	
	function updateTooltip(item)
	{
		if (ttLocked) return;
		
		var i = item.dataIndex,
		    s = item.series,
		    etc = s.etc;
		
		var branch = etc.branch,
		    test = etc.test,
		    platform = etc.platform,
		    machine = etc.machine || 'mean';
		
		var t = item.datapoint[0],
		    v = item.datapoint[1],
		    v0 = i ? s.data[i-1][1] : v,
		    dv = v - v0,
		    dvp = v/v0 - 1,
		    changeset = etc.changesets[item.dataIndex];
		
		$('#tt-series').html( test + ' (' + branch + ')' );
		$('#tt-series2').html( platform + ' (' + machine + ')' );
		$('#tt-v').html( parseInt(v) + ' ms' );
		$('#tt-dv').html( '&Delta; ' + dv.toFixed(0) + ' ms (' + (100*dvp).toFixed(1) + '%)' );
		$('#tt-cset').html( changeset ).attr( 'href', '#'+changeset );
		$('#tt-t').html( $.plot.formatDate(new Date(t), '%b %d, %y %H:%M') );
		
		plot.unhighlight();
		plot.highlight(s, item.datapoint);
	}

	function showTooltip(x, y)
	{
		if (ttLocked) return;

		var tip = $('#tooltip'),
		    w = tip.width(),
		    h = tip.height(),
		    left = x - w/2,
		    top = y - h - 10;
		
		if (ttHideTimer) {
			clearTimeout(ttHideTimer);
			ttHideTimer = null;
		}

		tip.stop(true);

		if (tip.css('visibility') == 'hidden') {
			tip.css({ opacity: 0, visibility: 'visible', left: left, top: top + 10 });
			tip.animate({ opacity: 1, top: top }, 250);
		} else {
			tip.css({ opacity: 1, left: left, top: top });
		}
	}
	
	function hideTooltip(now)
	{
		if (ttLocked) return;

		if (!ttHideTimer) {
			ttHideTimer = setTimeout(function() {
				ttHideTimer = null;
				plot.unhighlight();
				$('#tooltip').animate({ opacity: 0, top: '+=10' }, 250, 'linear', function() {
					$(this).css({ visibility: 'hidden' });
				});
			}, now ? 0 : 250);
		}
	}
	
	function lockTooltip() { ttLocked = true; $('#tooltip').addClass('locked'); }
	function unlockTooltip() { ttLocked = false; $('#tooltip').removeClass('locked'); }
	
	function isTooltipLocked() { return ttLocked; }
	

	$(init);
	
	
	$('#show-loading').click(function() {
		$('#loading-overlay')
			.animate({ opacity: 'show' }, 250)
			.delay(2000)
			.animate({ opacity: 'hide' }, 250);
			
		return false;
	});

	$('#show-error').click(function() {
		$('#errors .error').hide().css({ opacity: 1 });
		$('#errors').show();

		var delay = 0;
		$('#errors .error').each(function() {
			$(this).delay(delay).animate({ opacity: 'show' }, 500);
			delay += 500;
		});
		
		return false;
	});
	
	$('#errors .error .close').click(function() {
		$(this).closest('.error').animate({ opacity: 0 }, 250).animate({ height: 'hide' }, 250);
		return false;
	});
	
	$('#add-series').click(function (e) {
		$('#add-overlay')
			.css({ opacity: 0, display: 'table' })
			.animate({ opacity: 1 }, 250);
		return false;
	});
	
	$('#add-overlay').click(function (e) {
		if ($(e.target).closest('#add-data').length == 0) {
			$(this).animate({ opacity: 'hide' }, 250);
			return false;
		}
	});
	
	$('#add-data').submit(function (e) {
		$('#add-overlay').animate({ opacity: 'hide' }, 250);
		return false;
	});
	
	$('#add-data-cancel').click(function (e) {
		$('#add-data').get(0).reset();
		$('#add-overlay').animate({ opacity: 'hide' }, 250);
		return false;
	});
	
	
	$('#chart-link').click(function() {
		$('#link-overlay').showBubble(this);
		$('#link-url').val('').addClass('loading');
		setTimeout(function() {
			$('#link-url')
				.removeClass('loading').val('http://mzl.la/8E9Jk2')
				.focus().select();
		}, 500);
		return false;
	});
	
	$('#chart-embed').click(function() {
		$('#embed-overlay').showBubble(this);
		$('#embed-code').focus().select();
		return false;
	});

})(jQuery);
