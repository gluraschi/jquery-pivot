/**
 * jQuery UI Pivot 1.0.1
 * http://sistemasgsl.com
 *
 * Copyright 2014 Gabriel S. Luraschi
 * Released under the MIT license.
 * 
 * Depends:
 *   jquery.ui.core.js
 *   jquery.ui.widget.js
 */
( function( $ ) {
$.widget( "gsl.pivot", {
	version: "1.0.1",
	
	options: {
		numberFormat: "decimal",
		predefinedFormats: {
			"currency_us": {
				name: "currency_us",
				decimalPlaces: 2,
				decSeparator: ".",
				thouSeparator: ",",
				prefix: "$ ",
				suffix: ""
			},
			"currency_gb": {
				name: "currency_gb",
				decimalPlaces: 2,
				decSeparator: ".",
				thouSeparator: ",",
				prefix: "£ ",
				suffix: ""
			},
			"currency_es": {
				name: "currency_es",
				decimalPlaces: 2,
				decSeparator: ".",
				thouSeparator: ",",
				prefix: "",
				suffix: " €"
			},
			"currency_ar": {
				name: "currency_ar",
				decimalPlaces: 2,
				decSeparator: ",",
				thouSeparator: ".",
				prefix: "$ ",
				suffix: ""
			},
			"integer": {
				name: "integer",
				decimalPlaces: 0,
				decSeparator: "",
				thouSeparator: "",
				prefix: "",
				suffix: ""
			},
			"decimal": {
				name: "decimal",
				decimalPlaces: 2,
				decSeparator: ".",
				thouSeparator: ",",
				prefix: "",
				suffix: ""
			},
			"user": {
				name: "user",
				decimalPlaces: 0,
				decSeparator: "",
				thouSeparator: "",
				prefix: "",
				suffix: ""
			}
		},
		labels: {
			agg: "AGG",
			inactive: "INACTIVE DIMENSIONS",
			total: "TOTAL GENERAL",
			total_of: "TOTAL OF",
			options: "Options",
			order: "Order",
			ascending: "Ascending",
			descending: "Descending",
			no: "No",
			ok:	"OK",
			sort_btd: "Sort by this dimension",
			metric: "Metric"
		},
		totals: true,
		subtotals: true,
		data: [],
		agg: [],
		inactive: [],
		rows: [],
		cols: [],
		sort: {},
		valueSort: {},
		
		beforeCalculate: null,
		afterCalculate: null,
		beforeDraw: null,
		afterDraw: null
	},
	
	// Properties.
	self: null,
	rowStruct: {},
	colStruct: {},
	gridStruct: {},
	distinct: [],
	
	_create: function () {
		self = this;
		self._setOptions(self.options);
	},
	
	_destroy: function () {
		self.element.find( ">*" ).remove();
	},
	
	_init: function () {
		this._trigger( "beforeCalculate" );
		self._createStructures();
		self._calculate();
		this._trigger( "afterCalculate" );
		self._sort();
		this._trigger( "beforeDraw" );
		self.draw();
		this._trigger( "afterDraw" );
	},
	
	_setOptions: function ( options ) {
		$.extend( self.options, options );
		
		if ( typeof self.options.numberFormat === "string" ) {
			if ( self.options.predefinedFormats[ self.options.numberFormat ] === undefined ) {
				self.options.numberFormat = self.options.predefinedFormats[ "decimal" ];
			}
			else {
				self.options.numberFormat = self.options.predefinedFormats[ self.options.numberFormat ];
			}
		}
		else {
			self.options.numberFormat.name = "user";
		}
		
		// Agg columns options.
		var aggOptions = {
			index: "",
			func: "",
			format: self.options.numberFormat
		};
		
		var index = null;
		for ( index in options.agg ) {
			if ( typeof self.options.agg[ index ].format === "string" ) {
				if ( self.options.predefinedFormats[ self.options.agg[ index ].format ] === undefined ) {
					self.options.agg[ index ].format = self.options.predefinedFormats[ "decimal" ];
				}
				else {
					self.options.agg[ index ].format = self.options.predefinedFormats[ self.options.agg[ index ].format ];
				}
			}
			else {
				self.options.agg[ index ].format.name = "user";
			}
			
			self.options.agg[ index ] = $.extend( true, {}, aggOptions, options.agg[ index ] );
		}
	},
	
	// Internal (debug).
	_progress: function ( mensaje ) {
		( function ( get_as_float ) {
		    var unixtime_ms = new Date().getTime();
		    var sec = parseInt( unixtime_ms / 1000 );
		    return get_as_float ? ( unixtime_ms / 1000 ) : ( unixtime_ms - ( sec * 1000 ) ) / 1000 + " " + sec;
		})( true );
	},
	
	// Basic struct for data collection.
	_struct: function () {
		return {
			itemsName: "",
			items: [],
			sorted: [],
			totals: [],
			sources: [],
			span: 0,
			deep: 0,
			value: null,
			parent: null
		};
	},
	
	// Recursive span increment.
	_incrementSpan: function ( ptr ) {
		while ( ptr ) {
			++ptr.span;
			ptr = ptr.parent;
		}
	},
	
	// Add sources for recursive totals calculations.
	_addSources: function ( ptr, data ) {
		var index = null;
		for ( index in self.options.agg ) {
			var value = parseFloat( data[ self.options.agg[ index ][ "index" ] ] );
			
			while ( ptr ) {
				ptr.sources.push( value );
				ptr = ptr.parent;
			}
		}
	},
	
	// Create data structures.
	_createStructures: function () {
		// Define distinct arrays.
		var item = null;
		for ( item in self.options.data[ 0 ] ) {
			self.distinct[ item ] = [];
		}
		
		// Fill distinct arrays.
		var index = null;
		for ( index in self.distinct ) {
			for ( item in self.options.data ) {
				if ( self.distinct[ index ].indexOf( self.options.data[ item ][ index ] ) === -1 ) {
					self.distinct[ index ].push( self.options.data[ item ][ index ] );
				}
			}
			
			// Order distinct arrays.
			if ( self.distinct[ index ].length > 1 ) {
				if ( !isNaN( parseFloat( self.distinct[ index ][ 0 ] ) ) && isFinite( self.distinct[ index ][ 0 ] ) ) {
					self.distinct[ index ] = self.distinct[ index ].sort(function (a, b) {
						return a - b;
					});
				}
				else {
					self.distinct[ index ] = self.distinct[ index ].sort();
				}
			}
		}
		
		// Create structures function.
		var create = function ( cols ) {
			// New empty struct.
			var struct = self._struct();
			
			var index;
			for ( index = 0; index < self.options.data.length; ++index ) {
				var data = self.options.data[ index ];
				
				// Active struct pointer.
				var ptr = struct;
				
				var iCol;
				for ( iCol = 0; iCol < cols.length; ++iCol ) {
					var iCol1 = iCol + 1;
					var idx = data[ cols[ iCol ] ];
					
					// On the first dimension, the pointer is correct and no change.
					// The first element points to the upper dimension.
					if ( iCol > 0 ) {
						ptr = ptr.items[ data[ cols[ iCol - 1 ] ] ];
					}
					
					// Set de data source name.
					ptr.itemsName = cols[ iCol ];
					
					// Create new struct if index doesn't exists.
					if ( ptr.items[ idx ] === undefined ) {
						// Create new struct.
						var newStruct = self._struct();
						// Add parent pointer.
						newStruct.parent = ptr;
						// Asign struct deep.
						newStruct.deep = iCol1;
						// Asign value.
						newStruct.value = data[ cols[ iCol ] ];
						// Asign the new struct to the pointer.
						ptr.items[ idx ] = newStruct;
						
						// Only on the last level, increment span.
						if ( iCol1 == cols.length ) {
							self._incrementSpan( ptr );
						}
						else if ( self.options.subtotals && iCol1 > 1 && iCol1 < cols.length ) {
							// Increment span if has subtotal columns.
							self._incrementSpan( ptr );
						}
					}
					
					// Data source for totals calculation.
					// Only on the last level item.
					if ( ptr.deep + 1 === cols.length ) {
						// TODO: Ver si se puede correr esta llamada fuera del bucle más interno para optimizar rendimiento.
						self._addSources( ptr.items[ idx ], data );
					}
				}
			}
			
			return struct;
		};
		
		// Create all data structures.
		self.colStruct = create( self.options.cols );
		self.rowStruct = create( self.options.rows );
		self.gridStruct = create( self.options.rows.concat( self.options.cols ) );
	},
	
	// Run calculations over all data.
	
	// Calculate totals.
	_calculate: function () {
		var calculateTotals = function ( ptr ) {
			// For each agg.
			var index = null;
			for ( index in self.options.agg ) {
				if ( typeof self.options.agg[ index ][ "func" ] === "function" ) {
					ptr.totals[ index ] = self.options.agg[ index ][ "func" ]( ptr.sources );
				}
				else {
					ptr.totals[ index ] = self._math[ self.options.agg[ index ][ "func" ] ]( ptr.sources );
				}
			}
			
			for ( index in ptr.items ) {
				calculateTotals( ptr.items[ index ] );
			}
		};
		
		calculateTotals( self.gridStruct );
		calculateTotals( self.colStruct );
		calculateTotals( self.rowStruct );
	},
	
	// Output format.
	
	// Return formatted data.
	_format: function ( value, format ) {
		var decValue = "";
		var thouValue = "";
		
		// If format is a function call it.
		if ( typeof format === "function" ) {
			return format( value );
		}
		
		// Round value.
		var div = Math.pow( 10, format.decimalPlaces );
		var newValue = Math.round( value * div );
		
		// Calculate parts.
		var intValue = parseInt( newValue / div );
		
		// Calculate decimal values. Repeat zero for decimal places.
		if ( newValue == 0 ) {
			decValue = new Array( format.decimalPlaces + 1 ).join( "0" );
		}
		else {
			decValue = String( newValue ).substr( - format.decimalPlaces );
		}
		
		// Thousand separator.
		if ( format.thouSeparator.length ) {
			var thouValueArr = [];
			var strValue = String( intValue );
			var len = strValue.length;
			do {
				if ( len - 3 > 0 ) {
					thouValueArr.push( strValue.substr( len - 3, 3 ) );
				}
				else {
					thouValueArr.push( strValue.substr( 0, len ) );
				}
				
				len -= 3;
			} while ( len > 0 );
			
			thouValue = thouValueArr.reverse().join( format.thouSeparator );
		}
		else {
			thouValue = intValue;
		}
		
		// Return formatted value.
		return format.prefix + thouValue + ( format.decimalPlaces > 0 ? format.decSeparator + decValue : "" ) + format.suffix;
	},
	
	// Agg functions.
	_math: {
		sum: function ( sources ) {
			var result = 0,
				index = null;
			
			for ( index in sources ) {
				result += sources[ index ];
			}
			return result;
		},
		
		count: function ( sources ) {
			return sources.length;
		},
		
		product: function( sources ) {
			var result = 1,
				i = 0;
			
			for ( ; i < sources.length ; ++i ) {
				result *= sources[ i ];
			}
			
			return result;
		},
		
		amean: function( sources ) {
			var result = 0,
				i = 0;
			
			for ( ; i < sources.length ; ++i ) {
				result += sources[ i ];
			}
			
			result = ( sources.length ? result / sources.length : 0 );
			
			return result;
		},
		
		max: function( sources ) {
			if ( sources.length == 0 ) {
				return 0;
			}
			
			var result = sources[ 0 ],
				i = 1;
			
			for ( ; i < sources.length; ++i ) {
				if (sources[ i ] > result) {
					result = sources[ i ];
				}
			}
			
			return result;
		},
		
		min: function( sources ) {
			if ( sources.length == 0 ) {
				return 0;
			}
			
			var result = sources[ 0 ],
				i = 1;
			
			for ( ; i < sources.length; ++i ) {
				if (sources[ i ] < result) {
					result = sources[ i ];
				}
			}
			
			return result;
		},
		
		distinct: function( sources ) {
			var result = 0,
				results = {},
				i = 0;
			
			for ( ; i < sources.length ; ++i ) {
				results[ sources[ i ] ] = 1;
			}
			
			for (p in results) {
				++result;
			}
			
			return result;
		},
		
		deviation: function( sources ) {
			var result = self._math.variance( sources );
			return Math.sqrt( result );
		},
		
		variance: function( sources ) {
			if ( sources.length < 2 ) {
				return 0;
			}
			
			var result = 0,
				avg = self._math.amean ( sources ),
				i = 0;
			
			for ( ; i < sources.length; ++i ) {
				result += ( sources[ i ] - avg ) * ( sources[ i ] - avg );
			}
			
			return ( result / ( sources.length - 1 ) );
		},
		
		median: function( sources ) {
			var sorted = sources.sort( function ( a, b ) {
				return a - b;
			} );
			
			var i = Math.floor( sources.length / 2 );
			
			return sorted[ i ];
		},
		
		mode: function( sources ) {
			var conversion = {},
				i = 0;
			
			for ( ; i < sources.length; ++i ) {
				var val = sources[ i ];
				var index = val + "";
				if ( !( index in conversion ) ) {
					conversion[ index ] = 1;
				}
				else {
					++conversion[ index ];
				}
			}
			
			var max = 0,
				prop = "",
				p = null;
			
			for ( p in conversion ) {
				var cnt = conversion[ p ];
				if ( cnt > max ) {
					max = cnt;
					prop = p;
				}
			}
			
			return parseFloat( prop );
		}
	},
	
	// Data sorting.
	_sort: function () {
		var numericSort = function ( a, b ) {
			return a - b;
		};
		
		// Recursive sorting.
		var sort = function ( ptr ) {
			var claves = Object.keys( ptr.items );
			
			if ( claves.length == 0 ) {
				return false;
			}
			
			if ( !isNaN( parseFloat( claves[ 0 ] ) ) && isFinite( claves[ 0 ] ) ) {
				ptr.sorted = claves.sort( numericSort );
			}
			else {
				ptr.sorted = claves.sort();
			}
			
			if ( self.options.sort[ ptr.itemsName ] !== undefined ) {
				if ( self.options.sort[ ptr.itemsName ].direction == "desc" ) {
					ptr.sorted.reverse();
				}
			}
			
			for ( index in ptr.items ) {
				sort( ptr.items[ index ] );
			}
		};
		
		sort( self.rowStruct );
		sort( self.colStruct );
		sort( self.gridStruct );
		
		// If no sort by value, exits from this routine.
		if ( self.options.valueSort.index === undefined || self.options.valueSort.index == "" ) {
			return;
		}
		
		var advSort = self.options.valueSort;
		var index = null;
		
		// Determines the dimension to order.
		if ( self.options.cols.indexOf( self.options.valueSort.index ) > -1 ) {
			advSort.itemsName = self.options.rows[ 0 ];
			advSort.type = "cols";
		}
		else {
			advSort.itemsName = self.options.cols[ 0 ];
			advSort.type = "rows";
		}
		
		// Create data collection to order.
		var cltn = [];
		if ( advSort.type == "cols" ) {
			for ( index in self.gridStruct.items ) {
				if ( self.gridStruct.items[ index ].items[ advSort.value ] === undefined ) {
					cltn[ index ] = 0;
				}
				else {
					cltn[ index ] = self.gridStruct.items[ index ].items[ advSort.value ].totals[ advSort.metric ];
				}
			}
		}
		else {
			for ( index in self.distinct[ advSort.itemsName ] ) {
				if ( self.gridStruct.items[ advSort.value ].items[ self.distinct[ advSort.itemsName ][ index ] ] === undefined ) {
					cltn[ self.distinct[ advSort.itemsName ][ index ] ] = 0;
				}
				else {
					cltn[ self.distinct[ advSort.itemsName ][ index ] ] = self.gridStruct.items[ advSort.value ].items[ self.distinct[ advSort.itemsName ][ index ] ].totals[ advSort.metric ];
				}
			}
		}
		
		// Sort the data collection.
		var oc = new Array();
		for ( index in cltn ) {
			oc.push( [ index, cltn[ index ] ] );
		}
		
		oc.sort( function ( a, b ) {
			if ( a[ 1 ] < b[ 1 ] ) {
				return -1;
			}
			else if ( a[ 1 ] > b[ 1 ] ) {
				return 1;
			}
			else {
				return 0;
			}
		});
		
		var sorted = new Array();
		for ( index in oc ) {
			sorted.push( oc[ index ][ 0 ]);
		}
		if ( advSort.direction == "desc" ) {
			sorted.reverse();
		}
		
		// Sets order.
		if ( advSort.type == "rows" ) {
			self.colStruct.sorted = sorted;
		}
		else {
			self.rowStruct.sorted = sorted;
		}
	},
	
	// User interactions.
	_interactions: function () {
		var elem = $( self.element );
		
		var iconsW = $ ( "<div class='ui-pivot-iconsw' style='position: absolute;'><span class='ui-icon ui-icon-arrowthick-1-e'></span><span class='ui-pivot-whitespace'></span><span class='ui-icon ui-icon-arrowthick-1-w'></span></div>" );
		var iconsH = $ ( "<div class='ui-pivot-iconsh' style='position: absolute;'><span class='ui-icon ui-icon-arrowthick-1-s'></span><span class='ui-pivot-whitespace'></span><span class='ui-icon ui-icon-arrowthick-1-n'></span></div>" );
		
		elem.append( iconsW, iconsH );
		
		var changed = false;
		
		var showIcon = function ( ref, where ) {
			var offset = $( ref ).offset();
			
			$( ref ).data( "pos", where );
			
			var coordsCol = {
				top: offset.top - 8,
				bottom: offset.top + $( ref ).outerHeight( false ) - 8,
				left: offset.left - 16,
				right: offset.left + $( ref ).outerWidth( false )
			};
			
			var coordsRow = {
				top: offset.top - 16,
				bottom: offset.top + $( ref ).outerHeight( false ),
				left: offset.left - 8,
				right: offset.left + $( ref ).outerWidth( false ) - 8
			};
			
			iconsW.find( ".ui-pivot-whitespace" ).css( "width", $( ref ).outerWidth( false ) );
			iconsH.find( ".ui-pivot-whitespace" ).css( "height", $( ref ).outerHeight( false ) );
			
			switch ( where ) {
				case "t":
					iconsW
						.css( "top", coordsCol.top )
						.css( "left", coordsCol.left );
					break;
					
				case "b":
					iconsW
						.css( "top", coordsCol.bottom )
						.css( "left", coordsCol.left );
					break;
					
				case "l":
					iconsH
						.css( "top", coordsRow.top )
						.css( "left", coordsRow.left );
					break;
					
				case "r":
					iconsH
						.css( "top", coordsRow.top )
						.css( "left", coordsRow.right );
					break;
			}
			
			if ( where == "t" || where == "b" ) {
				iconsH.hide();
				
				if ( !iconsW.is( ":visible" ) ) {
					iconsW.fadeIn();
				}
			}
			else {
				iconsW.hide();
				
				if ( !iconsH.is( ":visible" ) ) {
					iconsH.fadeIn();
				}
			}
		};
		
		elem.find( ".ui-pivot-item" ).draggable({
			zIndex: 1,
			scroll: false,
			drag: function ( e, ui ) {
				var over = $( this ).data( "over" );
				
				if ( over == undefined ) {
					return true;
				}
				
				if ( $( over ).is( "caption" ) ) {
					iconsW.hide();
					iconsH.hide();
				}
				else if ( $( over ).closest( "tr" ).hasClass( "ui-pivot-col-header") ) {
					var dragOffset = {
						top: $( this ).offset().top,
						bottom: $( this ).offset().top + $( this ).outerHeight( false ),
						height: $( this ).outerHeight( false )
					};
					
					var overOffset = {
						top: $( over ).offset().top,
						bottom: $( over ).offset().top + $( over ).outerHeight( false ),
						height: $( over ).outerHeight( false )
					};
					
					var condT = dragOffset.bottom >= overOffset.top && dragOffset.bottom <= overOffset.bottom;
					var condB = dragOffset.top >= overOffset.top && dragOffset.top <= overOffset.bottom;
					
					if ( condT ) {
						if ( dragOffset.bottom > overOffset.top + overOffset.height / 2 ) {
							showIcon( over, "b" );
						}
						else {
							showIcon( over, "t" );
						}
					}
					else if ( condB ) {
						if ( dragOffset.top > overOffset.top + overOffset.height / 2 ) {
							showIcon( over, "b" );
						}
						else {
							showIcon( over, "t" );
						}
					}
				}
				else if ( $( over ).closest( "tr" ).hasClass( "ui-pivot-row-header" ) ) {
					var dragOffset = {
						left: $( this ).offset().left,
						right: $( this ).offset().left + $( this ).outerWidth( false ),
						width: $( this ).outerWidth( false )
					};
					
					var overOffset = {
						left: $( over ).offset().left,
						right: $( over ).offset().left + $( over ).outerWidth( false ),
						width: $( over ).outerWidth( false )
					};
					
					var condR = dragOffset.left >= overOffset.left && dragOffset.left <= overOffset.right;
					var condL = dragOffset.right >= overOffset.left && dragOffset.right <= overOffset.right;
					
					if ( condR ) {
						if ( dragOffset.left + dragOffset.width / 2 > overOffset.left + overOffset.width / 2 ) {
							showIcon( over, "r" );
						}
						else {
							showIcon( over, "l" );
						}
					}
					else if ( condL ) {
						if ( dragOffset.right + dragOffset.width / 2 > overOffset.left + overOffset.width / 2 ) {
							showIcon( over, "r" );
						}
						else {
							showIcon( over, "l" );
						}
					}
				}
			},
			
			revert: function () {
				var over = $( this ).data( "over" );
				
				if ( over == undefined ) {
					changed = false;
					return true;
				}
				
				var $over = $( over );
				
				var m = $( this ).text();
				var o = $over.text();
				
				// Removes selected item.
				if ( ( index = self.options.rows.indexOf( m ) ) > -1 ) {
					if ( self.options.rows.length == 1 ) {
						return true;
					}
					
					self.options.rows.splice( index, 1 );
				}
				else if ( ( index = self.options.cols.indexOf( m ) ) > -1 ) {
					if ( self.options.cols.length == 1 ) {
						return true;
					}
					
					self.options.cols.splice( index, 1 );
				}
				else if ( ( index = self.options.inactive.indexOf( m ) ) > -1 ) {
					self.options.inactive.splice( index, 1 );
				}
				
				if ( $over.is( "caption" ) ) {
					self.options.inactive.push( $( this ).text() );
				}
				else if ( $over.closest( "tr" ).hasClass( "ui-pivot-col-header" ) ) {
					var index = self.options.cols.indexOf( o );
					
					if ( $over.data( "pos" ) == "t" ) {
						self.options.cols.splice( index, 0, m );
					}
					else {
						self.options.cols.splice( index + 1, 0, m );
					}
				}
				else if ( $over.closest( "tr" ).hasClass( "ui-pivot-row-header" ) ) {
					var index = self.options.rows.indexOf( o );
					
					if ( $over.data( "pos" ) == "l" ) {
						self.options.rows.splice( index, 0, m );
					}
					else {
						self.options.rows.splice( index + 1, 0, m );
					}
				}
				
				changed = true;
				return false;
			},
			stop: function ( e, ui ) {
				iconsW.fadeOut();
				iconsH.fadeOut();
				if ( changed ) {
					self._init();
				}
			},
		});
		
		elem.find( ".ui-pivot-droppable" ).droppable({
			tolerance: "touch",
			drop: function ( e, ui ) {
				elem.find( ".ui-pivot-droppable.ui-state-highlight" ).removeClass( "ui-state-highlight" );
			},
			out: function ( e, ui ) {
				$( this ).removeClass( "ui-state-highlight" );
				if ( $( ui.draggable ).data( "over" ) == this ) {
					$( ui.draggable ).removeData( "over" );
					iconsW.hide();
					iconsH.hide();
				}
			},
			over: function ( e, ui ) {
				$( ui.draggable ).data( "over", this );
				
				elem.find( ".ui-pivot-droppable.ui-state-highlight" ).removeClass( "ui-state-highlight" );
				$( this ).addClass( "ui-state-highlight" );
			},
		});
		
		elem.find( ".ui-pivot-item, .ui-pivot-metric, .ui-pivot-dim:not(.ui-pivot-subtotal)" ).click( function () {
			var $this = $( this );
			
			// Dimension popup.
			if ( $this.is( ".ui-pivot-dim" ) ) {
				// Dialog element.
				var $dialog = $( "<div><div id='dialog_content'></div><br /><div align='right'><button type='button'>" + self.options.labels.ok + "</button></div></div>" );
				
				$dialog.dialog({
					autoOpen: false,
					modal: true,
					title: self.options.labels.options,
					minWidth: 320,
					close: function () {
						$dialog.dialog( "destroy" );
					}
				});
				
				// Dialog content.
				var $dialogContent = $dialog.find( "#dialog_content" );
				
				$dialogContent.append( self.options.labels.sort_btd + "<br /><input type='radio' name='order' id='order_disabled' value='' /> <label for='order_disabled'>" + self.options.labels.no + "</label> | <input type='radio' name='order' id='order_asc' value='asc' /> <label for='order_asc'>" + self.options.labels.ascending + "</label> | <input type='radio' name='order' id='order_desc' value='desc' /> <label for='order_desc'>" + self.options.labels.descending + "</label>" );
				
				var index = null;
				for ( index in self.options.agg ) {
					$dialogContent.append( "<br /> - <input type='radio' name='metric' id='metric_" + index + "' value='" + index + "' /> <label for='metric_" + index + "'>"+ self.options.agg[ index ].index +" ("+ self.options.agg[ index ].func +")</label>" );
				}
				
				if ( $this.attr( "index" ) == self.options.valueSort.index && $this.text() == self.options.valueSort.value ) {
					if ( self.options.valueSort.direction == "asc" ) {
						$dialogContent.find( "#order_asc" ).prop( "checked", true );
					}
					else {
						$dialogContent.find( "#order_desc" ).prop( "checked", true );
					}
					
					$dialogContent.find( "input[name=metric][value=" + self.options.valueSort.metric + "]:first" ).prop( "checked", true );
				}
				else {
					$dialogContent.find( "#order_disabled" ).prop( "checked", true );
					$dialogContent.find( "input[name=metric]:first" ).prop( "checked", true );
				}
				
				$dialog.find( "button:first" ).button().click( function () {
					var valueSort = {};
					
					if ( $dialog.find( "#order_asc" ).prop( "checked" ) ) {
						valueSort.direction = "asc";
					}
					else if ( $dialog.find( "#order_desc" ).prop( "checked" ) ) {
						valueSort.direction = "desc";
					}
					
					if ( valueSort.direction != undefined ) {
						valueSort.index = $this.attr( "index" );
						valueSort.value = $this.text();
						valueSort.metric = $dialogContent.find( "input[name=metric]:checked" ).val();
					}
					
					// Draw only if has changed.
					if ( JSON.stringify( [ valueSort.index, valueSort.value, valueSort.direction, valueSort.metric ] ) !== JSON.stringify( [ self.options.valueSort.index, self.options.valueSort.value, self.options.valueSort.direction, self.options.valueSort.metric ] ) ) {
						
						// Clear conflicting orders.
						if ( valueSort.index ) {
							var tmp;
							
							if ( self.options.cols.indexOf( valueSort.index ) > -1 ) {
								tmp = self.options.rows;
							}
							else {
								tmp = self.options.cols;
							}
							
							for ( index in tmp ) {
								delete self.options.sort[ tmp[ index ] ];
							}
						}
						
						self.options.valueSort = valueSort;
						self._init();
					}
					
					$dialog.dialog( "close" );
				});
				
				$dialog.dialog( "open" );
			}
			// Metric popup.
			else if ( $this.is( ".ui-pivot-metric" ) ) {
				// Dialog element.
				var $dialog = $( "<div><div id='dialog_content'></div><br /><div align='right'><br /><button type='button'>" + self.options.labels.ok + "</button></div></div>" );
				
				$dialog.dialog({
					autoOpen: false,
					modal: true,
					title: self.options.labels.options,
					minWidth: 320,
					close: function () {
						$dialog.dialog( "destroy" );
					}
				});
				
				// Dialog content.
				var $dialogContent = $dialog.find( "#dialog_content" );
				
				// Objects for cloning.
				var $aggFunctions = $( "<select/>" );
				var func = null;
				for ( func in self._math ) {
					$aggFunctions.append( $( "<option value='" + func + "'>" + func + "</option>" ) );
				}
				var $aggFormat = $( "<select/>" );
				var format = null;
				for ( format in self.options.predefinedFormats ) {
					$aggFormat.append( $( "<option value='" + format + "'>" + format + "</option>" ) );
				}
				
				// Fill dialog content.
				var i = 0;
				for ( i = 0; i < self.options.agg.length; ++i ) {
					var $func = $aggFunctions.clone();
					$func.find( "option[value=" + self.options.agg[ i ].func + "]" ).prop( "selected", true );
					$func.addClass( "ui-pivot-aggfunction" );
					$func.attr( "name", i );
					
					var $format = $aggFormat.clone();
					$format.find( "option[value=" + self.options.agg[ i ].format.name + "]" ).prop( "selected", true );
					$format.addClass( "ui-pivot-aggformat" );
					$format.attr( "name", i );
					
					$dialogContent.append( self.options.agg[ i ].index );
					$dialogContent.append( " " );
					$dialogContent.append( $func );
					$dialogContent.append( " " );
					$dialogContent.append( $format );
					$dialogContent.append( "<br />" );
				}
				
				// Set new metric options.
				$dialog.find( "button:first" ).button().click( function () {
					var changed = false;
					
					$dialog.find( ".ui-pivot-aggfunction" ).each( function ( index, element ) {
						var $element = $( element );
						
						if ( self.options.agg[ $element.attr( "name" ) ].func != $element.find( "option:selected" ).val() ) {
							self.options.agg[ $element.attr( "name" ) ].func = $element.find( "option:selected" ).val();
							changed = true;
						}
					});
					
					$dialog.find( ".ui-pivot-aggformat" ).each( function ( index, element ) {
						var $element = $( element );
						
						if ( self.options.agg[ $element.attr( "name" ) ].format.name != $element.find( "option:selected" ).val() ) {
							self.options.agg[ $element.attr( "name" ) ].format = self.options.predefinedFormats[ $element.find( "option:selected" ).val() ];
							changed = true;
						}
					});
					
					// Draw only if has changed.
					if (changed) {
						self._init();
					}
					
					$dialog.dialog( "close" );
				});
				
				$dialog.dialog( "open" );
			}
			else if ( $this.parent().is( ".ui-pivot-row-header, .ui-pivot-col-header" ) ) {
				// Dialog element.
				var $dialog = $( "<div>" + self.options.labels.order + "<br /><input type='radio' name='order' id='order_disabled' value='' /> <label for='order_disabled'>" + self.options.labels.no + "</label><input type='radio' name='order' id='order_asc' value='asc' /> <label for='order_asc'>" + self.options.labels.ascending + "</label> | <input type='radio' name='order' id='order_desc' value='desc' /> <label for='order_desc'>" + self.options.labels.descending + "</label><br /><div align='right'><br /><button type='button'>" + self.options.labels.ok + "</button></div></div>" );
				
				$dialog.dialog({
					autoOpen: false,
					modal: true,
					title: self.options.labels.options,
					minWidth: 320,
					close: function () {
						$dialog.dialog( "destroy" );
					}
				});
				
				// Determines direction order.
				var actualOrder = self.options.sort[ $this.text() ];
				
				if ( actualOrder === undefined ) {
					actualOrder = { direction: "" };
				}
				
				if ( actualOrder.direction == "asc" ) {
					$dialog.find( "#order_asc" ).prop( "checked", true );
				}
				else if ( actualOrder.direction == "desc" ){
					$dialog.find( "#order_desc" ).prop( "checked", true );
				}
				else {
					$dialog.find( "#order_disabled" ).prop( "checked", true );
				}
				
				// Set new order.
				$dialog.find( "button:first" ).button().click( function () {
					var newOrder = { direction: $dialog.find( ":radio:checked" ).val() };
					
					if ( actualOrder.direction != newOrder.direction ) {
						if ( newOrder.direction == "" ) {
							delete self.options.sort[ $this.text() ];
						}
						else {
							self.options.sort[ $this.text() ] = newOrder;
						}
						
						var tmp;
						if ( self.options.cols.indexOf( $this.text() ) > -1 ) {
							tmp = self.options.rows;
						}
						else {
							tmp = self.options.cols;
						}
						
						var index = null;
						for ( index in tmp ) {
							if ( self.options.valueSort.index == tmp[ index ] ) {
								self.options.valueSort = {};
								break;
							}
						}
						
						self._init();
					}
					
					$dialog.dialog( "close" );
				});
				
				$dialog.dialog( "open" );
			}
			else if ( $this.parent.is( "caption" ) ) {
				// Popup disabled in inactive area.
				return false;
			}
		});
	},
	
	// Draw pivot.
	draw: function () {
		var elem = $( "<div />" ).css("display", "none");
		elem.addClass( "ui-widget ui-widget-content ui-corner-all ui-pivot" );
		
		// DOM objects for cloning.
		var
			$tr = $( "<tr />" ),
			$th = $( "<th />" ),
			$col = $( "<th />" ),
			$dim = $( "<th class='ui-pivot-dim' />" ),
			$empty = $( "<td class='empty' />" ),
			$cell = $( "<td class='cell' />" ),
			$inactive = $( "<div class='ui-state-default ui-pivot-inactive ui-pivot-item' />" ),
			$tot = $( "<th class='ui-pivot-tot' />" ),
			$totCell = $( "<th class='ui-pivot-tot-cell' />" ),
			tr = null,
			th = null,
			dim = null,
			inactive = null;
		
		var table = $( "<table class='ui-widget-content ui-corner-bottom ui-pivot' />" );
		
		// Draw head.
		var drawHead = function () {
			elem.append( table );
			
			var caption = $( "<caption class='ui-widget-header ui-widget-content ui-corner-top ui-pivot-droppable' />" );
			table.append( caption );
			
			/* Draw table */
				// Inactive dimensions.
				if ( self.options.inactive.length ) {
					var index = null;
					for ( index in self.options.inactive ) {
						inactive = $inactive.clone();
						inactive.text( self.options.inactive[ index ] );
						caption.append( inactive );
					}
				}
				else {
					caption.text( self.options.labels.inactive );
				}
				
				// First row.
				tr = $tr.clone();
				
				// Superior left corner.
				var metric = 
					$th
					.clone()
					.text( self.options.labels.agg )
					.attr( "rowspan", self.options.cols.length )
					.attr( "colspan", self.options.rows.length )
					.addClass( "ui-state-default ui-pivot-metric" );
				tr.append( metric );
				
				var sortIcon = null;
				
				// Columns.
				for ( iCol in self.options.cols ) {
					if ( self.options.sort[ self.options.cols[ iCol ] ] !== undefined ) {
						if ( self.options.sort[ self.options.cols[ iCol ] ].direction == "asc" ) {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-n" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
						else {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-s" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
					}
					else {
						sortIcon = "";
					}
					
					th = $col.clone().html(
						self.options.cols[ iCol ] + sortIcon
					).addClass( "ui-state-default ui-pivot-item ui-pivot-droppable" );
					tr.append( th ).addClass( "ui-pivot-col-header" );
					
					table.append( tr );
					tr = $tr.clone();
				}
				
				var sortIcon = "";
				
				// Rows.
				tr = $tr.clone();
				for ( iRow in self.options.rows ) {
					if ( self.options.sort[ self.options.rows[ iRow ] ] !== undefined ) {
						if ( self.options.sort[ self.options.rows[ iRow ] ].direction == "asc" ) {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-n" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
						else {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-s" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
					}
					else {
						sortIcon = "";
					}
					
					th = $col.clone().html( self.options.rows[ iRow ] + sortIcon ).addClass( "ui-state-default ui-pivot-item ui-pivot-droppable" );
					tr.append( th ).addClass( "ui-pivot-row-header" );
					
					table.append( tr );
				}
		};
		
		// Draw columns names.
		var drawColTitles = function () {
			// Temporary data buffer.
			var buffer = [];
			
			// Position pointer.
			var ptr = self.colStruct;
			var aggLen = self.options.agg.length;
			var row = 0;
			tr = table.find( "tr:eq(" + row + ")" );
			var i;
			var sortIcon;
			
			do {
				var dim = null, item = null;
				for ( i = 0; i < ptr.sorted.length; ++i ) {
					item = ptr.sorted[ i ];
					
					if ( self.options.valueSort.index == ptr.itemsName ) {
						if ( self.options.valueSort.value == ptr.items[ item ].value ) {
							if ( self.options.valueSort.direction == "asc" ) {
								sortIcon = '<span class="ui-icon ui-icon-circle-triangle-n" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
							}
							else {
								sortIcon = '<span class="ui-icon ui-icon-circle-triangle-s" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
							}
						}
						else {
							sortIcon = "";
						}
					}
					else {
						sortIcon = "";
					}
					
					dim = $dim.clone().addClass( "ui-state-default" ).html( ptr.items[ item ].value === null ? "" : ptr.items[ item ].value + sortIcon );
					
					// Set DOM element into data set for correct span.
					ptr.items[ item ].element = dim;
					
					// Calculate span.
					var span = 0;
					
					if ( ptr.items[ item ].span ) {
						span += ptr.items[ item ].span * aggLen;
					}
					else {
						span += aggLen;
					}
					
					// Set span.
					dim.attr( "colspan", span );
					
					// Set index name.
					dim.attr( "index", ptr.itemsName );
					
					// Change row if different deep.
					if ( parseInt( ptr.items[ item ].deep ) - 1 != row ) {
						tr = table.find( "tr:eq(" + ( parseInt( ptr.items[ item ].deep ) - 1 ) + ")" );
					}
					
					// Append cell to row.
					tr.append( dim );
					// Fill buffer with next items.
					buffer.push( ptr.items[ item ] );
					
					// Subtotal column.
					if ( self.options.subtotals ) {
						if ( ptr.items[ item ].sorted.length ) {
							dim = $dim.clone().addClass( "ui-pivot-subtotal" ).text( self.options.labels.total_of + " " + ( ptr.items[ item ].value === null ? "" : ptr.items[ item ].value ) );
							dim.attr( "colspan", aggLen );
							dim.attr( "rowspan", self.options.cols.length + 1 - ptr.items[ item ].deep );
							tr.append( dim );
						}
					}
				}
				
				// Next item to proccess.
				ptr = buffer.shift();
				
			} while ( Object.getOwnPropertyNames( ptr.items ).length > 1 || buffer.length > 0 );
			
			// Total column.
			if ( self.options.totals ) {
				table.find( "tr:first" ).append(
					$tot.clone()
						.text( self.options.labels.total )
						.attr( "rowspan", self.options.cols.length )
						.attr( "colspan", self.options.agg.length )
				);
			}
		};
		
		// Draw rows names.
		var drawRowTitles = function () {
			var drawCell = function ( ptr, tr ) {
				// Append new TR.
				table.append( tr );
				
				var sortIcon = "";
				
				if ( ptr.parent.itemsName == self.options.valueSort.index ) {
					if ( ptr.value == self.options.valueSort.value ) {
						if ( self.options.valueSort.direction == "asc" ) {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-n" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
						else {
							sortIcon = '<span class="ui-icon ui-icon-circle-triangle-s" style="display: inline-block; vertical-align: middle; margin-left: 4px;"></span>';
						}
					}
				}
				
				// New cell.
				dim = $dim.clone().addClass( "ui-state-default" ).html( ptr.value === null ? "" : ptr.value + sortIcon );
				if ( ptr.span ) {
					dim.attr( "rowspan", ptr.span );
				}
				
				// Set index name.
				dim.attr( "index", ptr.parent.itemsName );
				
				// Append dim to TR.
				tr.append( dim );
				
				// Go recursive if has items.
				if ( ptr.span ) {
					var i, item;
					for ( i = 0; i < ptr.sorted.length; ++i ) {
						item = ptr.sorted[ i ];
						drawCell( ptr.items[ item ], tr );
						// New tr for next cycle.
						tr = $tr.clone();
					}
				}
				else {
					// If empty, empty cell.
					tr.append( $empty.clone() );
				}
			};
			
			// First deep loop.
			var i, iRow;
			for ( i = 0; i < self.rowStruct.sorted.length; ++i) {
				var tr = $tr.clone();
				
				iRow = self.rowStruct.sorted[ i ];
				drawCell( self.rowStruct.items[ iRow ], tr );
			}
			
			// Total row.
			if ( self.options.totals ) {
				table.append( $tr.clone().append( $tot.clone().text( self.options.labels.total ).attr( "colspan", self.options.rows.length ) ).append( $empty.clone() ) );
			}
		};
		
		// Draw data grid.
		var drawGrid = function () {
			var pos = 0; var tr = null;
			
			var drawRow = function ( rowPtr, colPtr, gridPtr ) {
				var ptr = null;
				
				// If has childs.
				if ( rowPtr.span ) {
					var i, index;
					for ( i = 0; i < rowPtr.sorted.length; ++i ) {
						index = rowPtr.sorted[ i ];
						
						// Reference to actual TR.
						tr = table.find( "tr:eq(" + ( self.options.cols.length + pos + 1 ) + ")" );
						
						// Pointer to data struct only if has data.
						if ( gridPtr === undefined) {
							ptr = undefined;
						}
						else {
							ptr = gridPtr.items[ index ];
						}
						
						// If has items, go recursive.
						drawRow( rowPtr.items[ index ], colPtr, ptr );
						
						if ( rowPtr.deep === self.options.rows.length - 1 ) {
							++pos;
						}
					}
				}
				else if ( colPtr.span ) {
					var i, index;
					
					for ( i = 0; i < colPtr.sorted.length; ++i ) {
						index = colPtr.sorted[ i ];
						
						// Pointer to data struct only if has data.
						if ( gridPtr === undefined ) {
							ptr = undefined;
						}
						else {
							ptr = gridPtr.items[ index ];
						}
						
						// If has items, go recursive.
						drawRow( rowPtr, colPtr.items[ index ], ptr );
						
						// If has subtotals columns.
						if ( self.options.subtotals && colPtr.items[ index ].deep > 0 && colPtr.items[ index ].deep < self.options.cols.length ) {
							var index2 = null;
							for ( index2 in self.options.agg ) {
								cell = $cell.clone();
								tr.append( cell );
								
								var total = 0;
								
								// If subtotal draw it.
								if (gridPtr !== undefined && gridPtr.items[ index ] !== undefined) {
									total = gridPtr.items[ index ].totals[ index2 ];
								}
								
								cell.text( self._format( total, self.options.agg[ index2 ].format ) );
							}
						}
					}
				}
				// Cell !.
				else {
					var index = null;
					for ( index in self.options.agg ) {
						cell = $cell.clone();
						tr.append( cell );
						
						var total = 0;
						
						// If total draw it.
						if ( gridPtr !== undefined ) {
							total = gridPtr.totals[ index ];
						}
						
						cell.text( self._format( total, self.options.agg[ index ].format ) );
					}
				}
			};
			
			// Draw data.
			drawRow( self.rowStruct, self.colStruct, self.gridStruct );
			
			// Draw totals.
			if ( self.options.totals ) {
				
				// Row totals.
				( function () {
					tr = table.find( "tr:eq(" + ( self.options.cols.length + 1 ) + ")" );
					
					var buffer = [];
					var ptr = self.rowStruct;
					
					do {
						var i, item;
						for ( i = 0; i < ptr.sorted.length; ++i ) {
							item = ptr.sorted[ i ];
							
							if ( ptr.items[ item ].deep === self.options.rows.length ) {
								var aggIndex = null;
								for ( aggIndex in self.options.agg ) {
									tr.append( $totCell.clone().text( self._format( ptr.items[ item ].totals[ aggIndex ], self.options.agg[ aggIndex ].format ) ) );
								}
								
								tr = tr.next();
							}
							
							buffer.push( ptr.items[ item ] );
						}
						
						ptr = buffer.shift();
					} while ( Object.getOwnPropertyNames( ptr.items ).length > 1 || buffer.length );
				} )();
				
				// Col totals.
				( function () {
					tr = table.find( "tr:last" );
					
					var buffer = [];
					var ptr = self.colStruct;
					
					do {
						var i, item;
						for ( i = 0; i < ptr.sorted.length; ++i ) {
							item = ptr.sorted[ i ];
							
							if ( ptr.items[ item ].deep === self.options.cols.length ) {
								var aggIndex = null;
								for ( aggIndex in self.options.agg ) {
									tr.append( $totCell.clone().text( self._format( ptr.items[ item ].totals[ aggIndex ], self.options.agg[ aggIndex ].format ) ) );
								}
							}
							
							// Subtotal.
							if ( self.options.subtotals ) {
								if ( ptr.items[ item ].deep > self.options.cols.length - 1 ) {
									
									// Recursive function.
									var ps = function ( p ) {
										if ( p.parent.items[ p.parent.sorted[ p.parent.sorted.length - 1 ] ] == p ) {
											var aggIndex = null;
											for ( aggIndex in self.options.agg ) {
												var tmp = $totCell.clone().text( self._format( p.parent.totals[ aggIndex ], self.options.agg[ aggIndex ].format ) );
												tr.append( tmp );
											}
											
											// Go recursive for other subtotals.
											if ( p.parent && p.parent.deep > 1 ) {
												ps( p.parent );
											}
										}
										
									};
									
									ps( ptr.items[ item ] );
								}
							}
							
							buffer.push( ptr.items[ item ] );
						}
						
						ptr = buffer.shift();
					} while ( Object.getOwnPropertyNames( ptr.items ).length > 1 || buffer.length );
				} )();
				
				// General total.
				( function () {
					if ( self.options.cols.length > 1 ) {
						tr = table.find( "tr:last" );
						
						var i;
						for ( i = 0; i < self.options.agg.length; ++i ) {
							tr.append( $totCell.clone().text( self._format( self.gridStruct.totals[ i ], self.options.agg[ i ].format ) ) );
						}
					}
				} )();
			}
		};
		
		// Draw all.
		drawHead();
		drawColTitles();
		drawRowTitles();
		drawGrid();
		
		setTimeout(function () {
			self._interactions();
		});
		
		// Display table.
		var elemOld = $( self.element ).find( ">*" );
		$( self.element ).append( elem );
		elemOld.css("display", "none");
		elem.fadeIn();
		elemOld.remove();
	},
});
})( jQuery );