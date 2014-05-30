jQuery UI Pivot Table
=====================

A light-weight plugin to generate pivot tables.

- **[Documentation and Demos](https://github.com/gluraschi/jquery-pivot/)**

Change Log

1.0.0 - May 30, 2014 - Initial Commit

## Getting Started

### Ejemplo simple
```html
<div id="pivot"></div>

<script type="text/javascript">
  var jsonData = [{"year":"1997","month":"2","day":"4","customer":"CONSH","freight":"9.21"}];
  
  $( "#pivot" ).pivot({
    data: jsonData,
    agg: [{
      index: "freight",
      func: "sum",
      format: {
        prefix: "$ ",
        decimalPlaces: 2
      }
    }],
    inactive: [ "month", "day" ],
    cols: [ "year" ],
    rows: [ "customer" ]
  });
</script>
```

## Características generales
- Permite drag&drop de dimensiones.
- Múltiples funciones de agregación.
- Múltiples métricas calculadas.
- Posibilidad de definir el formato de cada una de las métricas y la función de agregación.
- Posibilidad de mostrar u ocultar totales y subtotales.
- Ordenación por dimesión o por métrica.

## Opciones

### Asignación de datos
```html
$( "#pivot" ).pivot({
	data: [{"year":"1997","month":"2","day":"4","customer":"CONSH","freight":"9.21"}]
});
```

### Etiquetas
```html
$( "#pivot" ).pivot({
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
	}
});
```

### Formato numérico
Opciones disponibles:
- currency_us
- currency_gb
- currency_es
- currency_ar
- integer
- decimal
- user

Ejemplo:
```html
$( "#pivot" ).pivot({
  numberFormat: "decimal"
});
```

### Opciones de visualización
Filas
```html
$( "#pivot" ).pivot({
  rows: [ "customer" ]
});
```

Columnas
```html
$( "#pivot" ).pivot({
  cols: [ "year" ]
});
```

Dimensiones inactivas
```html
$( "#pivot" ).pivot({
  inactive: [ "month", "day" ]
});
```

Mostrar totales
```html
$( "#pivot" ).pivot({
  totals: true
});
```

Mostrar subtotales
```html
$( "#pivot" ).pivot({
  subtotals: true
});
```

### Funciones de agregación
Opciones disponibles:
- sum
- count
- product
- amean
- max
- min
- distinct
- deviation
- variance
- median
- mode

Ejemplo:
```html
$( "#pivot" ).pivot({
  agg: [{
	  index: "freight",
	  func: "sum",
	  format: {
		  prefix: "$ ",
		  decimalPlaces: 2
	  }
  }]
});
```

### Ordenación
```html
$( "#pivot" ).pivot({
  sort: { "customer": { direction: "desc" } },
});
```

### Ordenación por métrica
```html
$( "#pivot" ).pivot({
  valueSort: {
		index: "year",
		value: "1997",
		direction: "desc"
	}
});
```

## Eventos
```html
$( "#pivot" ).pivot({
  // Antes de realizar cálculos.
  beforeCalculate: function () {},
  
  // Después de realizar cálculos.
  afterCalculate: function () {},
  
  // Antes del dibujado.
  beforeDraw: function () {},
  
  // Después del dibujado.
  afterDraw: function () {}
});
```
