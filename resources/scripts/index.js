/**
 * Size of a node.
 * @type {number}
 */
const NODE_SIZE = 18;

/**
 * Node & Link data.
 * @type {{nodes: Array, links: Array}}
 */
let data = {
  nodes: [],
  links: []
};

/**
 * Root SVG element for the visualization.
 */
let svg;

function zoomed()
{
  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function dragstarted()
{
  d3.event.sourceEvent.stopPropagation();
  d3.select(this).classed("dragging", true);
}

function dragged(node, index)
{
  node.x += d3.event.dx;
  node.y += d3.event.dy;

  d3.select(this).attr("x", node.x - NODE_SIZE / 2).attr("y", node.y - NODE_SIZE / 2);

  // move line beginning or end depending on whether we're dragging the source or target
  svg.selectAll("line").each(function(link)
  {
    if (link.source === index)
    {
      d3.select(this).attr("x1", node.x).attr("y1", node.y);
    }
    else if (link.target === index)
    {
      d3.select(this).attr("x2", node.x).attr("y2", node.y);
    }
  });

  // move inner text
  svg.selectAll(".node-inline-text").each(function(text)
  {
    if (text === node)
    {
      d3.select(this)
        .attr("dx", node.x - NODE_SIZE / 3)
        .attr("dy", node.y + NODE_SIZE / 3);
    }
  });

  // move text
  svg.selectAll(".node-text").each(function(text)
  {
    if (text === node)
    {
      d3.select(this)
        .attr("dx", node.x + NODE_SIZE / 2 + 1)
        .attr("dy", node.y + NODE_SIZE / 3);
    }
  });
}

function dragended()
{
  d3.select(this).classed("dragging", false);
}

// load csv on startup
$(window).on('load', function()
{
  $('#map').click(function()
  {
    let image = $(".img-data-map");
    if (image.is(':visible'))
    {
      image.hide(250);
    }
    else
    {
      image.show(250);
    }
  });

  $('#stations').click(function()
  {
    let image = $(".img-data-stations");
    if (image.is(':visible'))
    {
      image.hide(250);
    }
    else
    {
      image.show(250);
    }
  });

  $.ajax({
    url: 'resources/data/subway.csv',
    type: 'get',
    success: function(data_subway)
    {
      $.ajax({
        url: 'resources/data/positions.csv',
        type: 'get',
        success: function(data_positions)
        {
          visualize(data_subway, data_positions);
        }
      });
    }
  });
});

function visualize(data_subway, data_positions)
{
  let data_csv = d3.csv.parseRows(data_subway);
  data_positions = d3.csv.parseRows(data_positions);

  // create nodes
  for (let i = 0; i < data_csv.length; i++)
  {
    let stationData = data_csv[i];
    let station = stationData[0];

    data.nodes[i] = {
      name: station,
      x: parseInt(data_positions[i][0]),
      y: parseInt(data_positions[i][1]),
      id: i,
      cardinality: 0
    };

    // create links
    for (let j = 1; j < data_csv[i].length; j++)
    {
      if (stationData[j] === "1")
      {
        data.links.push({source: i, target: j - 1});
        data.nodes[i].cardinality += 3;
        if (data.nodes[j - 1] !== undefined)
        {
          data.nodes[j - 1].cardinality += 3;
        }
      }
    }
  }

  // behaviors
  let zoom = d3.behavior.zoom()
    .scaleExtent([0.15, 5.0])
    .on("zoom", zoomed);

  let drag =  d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);

  // create visualization
  // create root svg & g element to append nodes to
  svg = d3.select("body")
    .append("svg")
    .attr('class', 'svg')
    .attr("preserveAspectRatio", "none")
    .attr("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight)
    .call(zoom)
    .append("g");

  // arrowhead for lines
  svg.append('defs').append('marker')
    .attr(
    {
      'id': 'arrowhead',
      'viewBox': '-0 -5 10 10',
      'refX': 15,
      'refY': 0,
      'orient': 'auto',
      'markerWidth': 6,
      'markerHeight': 6,
      'xoverflow': 'visible'
    })
    .append('svg:path')
    .attr('class', 'arrowhead')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5');

  svg.append('image')
    .attr('xlink:href', './resources/img/ffm_map.png')
    .attr('width', 2477)
    .attr('height', 2477)
    .attr('class', 'img-data-map');

  svg.append('image')
    .attr('xlink:href', './resources/img/stations_raw.png')
    .attr('width', 2477)
    .attr('height', 2477)
    .attr('class', 'img-data-stations');

  // hide by default
  $('.img-data-stations').hide(0);

  // create links, add line to links
  svg.selectAll("link")
    .data(data.links)
    .enter()
    .append("line")
    .attr("marker-end", "url(#arrowhead)")
    .attr("class", "link")
    .attr("x1", function(l)
    {
      let source = data.nodes.filter(function(d, i)
      {
        return i === l.source
      })[0];
      d3.select(this).attr("y1", source.y);
      return source.x
    })
    .attr("x2", function(l)
    {
      let target = data.nodes.filter(function(d, i)
      {
        return i === l.target
      })[0];
      d3.select(this).attr("y2", target.y);
      return target.x
    });

  // create nodes
  let nodes = svg.selectAll("node").data(data.nodes).enter();

  // append circle to nodes, define drag behavior
  nodes.append("rect")
    .attr("class", "node")
    .attr("x", function(d) { return d.x - NODE_SIZE / 2; })
    .attr("y", function(d) { return d.y - NODE_SIZE / 2; })
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("width", NODE_SIZE)
    .attr("height", NODE_SIZE)
    .call(drag);

  nodes.append("text")
    .text("U")
    .attr("class", "node-inline-text")
    .attr("font-size", NODE_SIZE)
    .attr("dx", function(node) { return node.x - NODE_SIZE / 3; })
    .attr("dy", function(node) { return node.y + NODE_SIZE / 3; });

  nodes.append("text")
    .attr("class", "node-text")
    .attr("dx", function(node) { return node.x + NODE_SIZE / 2 + 1; })
    .attr("dy", function(node) { return node.y + NODE_SIZE / 3; })
    .text(function(node) { return node.name; });
}















