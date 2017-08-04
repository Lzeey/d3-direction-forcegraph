/*global $, d3*/
function directionGraph(divID) {
    /*
    Insert a div or svg with a predefined width (e.g.) to plot a directional force-graph
    
    The graph takes in data in the form of 
    [{'source': XXX, 'target': XXX, 'value': XXX},...]
    Will compute the unique nodes from the links automatically
    //Instantiation (does not draw)
    graph = directionGraph('myDivSelector');
    
    //Drawing (with data)
    graph.dataUpdate(data);
    
    References:
    https://medium.com/ninjaconcept/interactive-dynamic-force-directed-graphs-with-d3-da720c6d7811
    https://bl.ocks.org/rofrischmann/0de01de85296591eb45a1dde2040c5a1
    http://bl.ocks.org/mbostock/1153292
    */
    "use strict";
    
    //Define canvas
    //TODO: Grab width of parent object
    var parentDOM = d3.select(divID),
        width = parseInt(parentDOM.style('width'), 10),
        height = 600;
    
    //console.log(parseInt(parentDOM.style('width')));
    var svg = parentDOM.append("svg")
        .attr("width", width)
        .attr("height", height);

    //Generate groups
    var nodeGroup = svg.append('g').attr('class', 'nodes dirGraph'),
        linkGroup = svg.append('g').attr('class', 'links dirGraph'),
        textGroup = svg.append('g').attr('class', 'texts dirGraph');
    
    //Pre-define the arrows heads here
    //See "marker" and "path marker-end" for reference
    svg.append("defs").selectAll("marker")
        .data(["end"]) // Different link/path types can be defined here
        .enter().append("marker") // This section adds in the arrows
        .attr("id", function (d) {
            return d
        })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5"); //Draw triangle here
    //Predefine actual graph elements
    var linkElements, nodeElements, textElements;

    //Define force simulation objects -> link and sim
    var linkForce = d3.forceLink()
        .id(function(d) {return d.id}) //Accessor for name on node [optional];
        .distance(60)
    //.links(links) //Optional - 
    
    var simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-20)) //Defines the attraction of all nodes to center (gravity)
        .force("center", d3.forceCenter(width / 2, height / 2)) //Defines position of force center
        .force("link", linkForce); //Insert link behaviour

    //Define drag and drop behaviour
    var dragDrop = d3.drag()
        .on('start', function (node) {
            node.fx = node.x
            node.fy = node.y
        }).on('drag', function (node) {
            simulation.alphaTarget(0.7).restart()
            node.fx = d3.event.x
            node.fy = d3.event.y
        }).on('end', function (node) {
            if (!d3.event.active) {
                simulation.alphaTarget(0)
            }
            node.fx = null
            node.fy = null
        })

    //Data entry point here
    var links, nodes;

    graph = function () {
        return graph
    }

    //Method for updating the data from outside this scope
    graph.dataUpdate = function (data) {
        links = data;
        nodes = computeUniqueNodes(links);

        updateGraph();
        updateSimulation();
    }

    //Compute the unique nodes based on the links
    function computeUniqueNodes(links) {
        var nodes = {};
        links.forEach(function (link) {
            //Shitty javascript operation here. Return first value if truethy. Otherwise, second value
            //https://stackoverflow.com/questions/2802055/what-does-the-construct-x-x-y-mean/34707750
            link.source = nodes[link.source] || (nodes[link.source] = {
                name: link.source
            });
            link.target = nodes[link.target] || (nodes[link.target] = {
                name: link.target
            });
            link.value = +link.value;
        });

        //FIX HERE
        return d3.values(nodes)
    }

    //Internal method for updating graph by taking the latest data, and replotting stuff
    //Uses lexical scoping for graphical elements
    function updateGraph() {
        //For links, nodes, and text, we follow the pattern of
        // .data() -> exit().remove() -> enter().append()

        linkElements = linkGroup.selectAll("path")
            .data(links, function (link) {
                return link.source + link.target
            }); //#Use unique name as ID

        linkElements.exit().remove();

        var linkEnter = linkElements.enter()
            .append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)"); //Reference the defined marker
        linkElements = linkEnter.merge(linkElements);

        // define the nodes
        nodeElements = nodeGroup.selectAll("circle")
            .data(nodes)
        nodeElements.exit().remove();
        console.log(nodeElements);
        var nodeEnter = nodeElements.enter()
            .append("circle")
            .attr("r", 10)
            .attr("class", "node")
            .call(dragDrop);

        nodeElements = nodeEnter.merge(nodeElements);

        //Text
        textElements = textGroup.selectAll('text')
            .data(nodes)
        textElements.exit().remove()

        var textEnter = textElements.enter()
            .append('text')
            .text(function (d) {
                return d.name
            })
            .attr("x", 12)
            .attr("dy", ".35em");

        textElements = textEnter.merge(textElements);

    };

    //Update simulation. Inlucdes updateGraph, and redefining the 'tick' behaviour
    function updateSimulation() {
        updateGraph();

        simulation.nodes(nodes)
            .on('tick', function () {
                nodeElements
                    .attr('cx', function (node) {
                        return node.x
                    })
                    .attr('cy', function (node) {
                        return node.y
                    })
                textElements
                    .attr('x', function (node) {
                        return node.x
                    })
                    .attr('y', function (node) {
                        return node.y
                    })
                linkElements.attr("d", linkArc);
            
                //For line, use x1/y1, x2/y2
//                linkElements
//                    .attr('x1', function (link) {
//                        return link.source.x
//                    })
//                    .attr('y1', function (link) {
//                        return link.source.y
//                    })
//                    .attr('x2', function (link) {
//                        return link.target.x
//                    })
//                    .attr('y2', function (link) {
//                        return link.target.y
//                    })
            });

        simulation.force('link').links(links)
        simulation.alphaTarget(0.7).restart()

    };
    
    //Define elliptical arc path here - for 'd' attr of path
    function linkArc(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx*dx + dy*dy); //Arc radius
        return "M" + d.source.x + "," + d.source.y + "A" + dr*1.5 + "," + dr*1.5 + " 0 0,1 " + d.target.x + "," + d.target.y;
    }
    

    return graph
}