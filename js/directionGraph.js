/*global $, d3*/
function directionGraph(divID) {
    /*The graph takes in data in the form of 
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
        var width = window.innerWidth,
            height = window.innerHeight;
        var svg = d3.select(divID).append("svg")
            .attr("width", width)
            .attr("height", height);

        //Generate groups
        var nodeGroup = svg.append('g').attr('class', 'nodes dirGraph'),
            linkGroup = svg.append('g').attr('class', 'links dirGraph'),
            textGroup = svg.append('g').attr('class', 'texts dirGraph');
    
        //Pre-define the arrows here
        svg.append("defs").selectAll("marker")
            .data(["end"]) // Different link/path types can be defined here
            .enter().append("svg:marker") // This section adds in the arrows
            .attr("id", function(d) {return d})
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -1.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5");        
        //Predefine actual graph elements
        var linkElements, nodeElements, textElements;
        
        //Define force simulation objects -> link and sim
        var linkForce = d3.forceLink();
            //.links(links) //Optional - 
            //.id(function(d) {return d.id}) //Accessor for name on node [optional]
        var simulation = d3.forceSimulation()
            .force("charge", d3.forceManyBody().strength(-100)) //Defines the attraction of all nodes to center (gravity)
            .force("center", d3.forceCenter(width/2, height/2)) //Defines position of force center
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
        
        graph = function() {
            return graph
        }
        
        //Method for updating the data from outside this scope
        graph.dataUpdate = function(data) {
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
            link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
            link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
            link.value = +link.value;
            });
            
            //FIX HERE
            //nodes = d3.values(nodes).map(function(node) {return {'id': node}});
            //console.log(nodes)
            return d3.values(nodes)
        }
        
        //Internal method for updating graph by taking the latest data, and replotting stuff
        //Uses lexical scoping for graphical elements
        function updateGraph() {
            //For links, nodes, and text, we follow the pattern of
            // .data() -> exit().remove() -> enter().append()
            
            linkElements = linkGroup.selectAll("path")
                .data(links, function(link) {return link.source + link.target}); //#Use unique name as ID
                
            linkElements.exit().remove();
            
            var linkEnter = linkElements.enter()
                .append("path")
                .attr("class", "link")
                //.attr("class", function(d) { return "link " + d.type; })
                //.attr("marker-end", "url(#end)");
            linkElements = linkEnter.merge(linkElements);
                    
            // define the nodes
            nodeElements = nodeGroup.selectAll("circle")
                .data(nodes)
            nodeElements.exit().remove();
            
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
                .text(function (d) {return d.name})
                .attr("x", 12)
                .attr("dy", ".35em");
            
            textElements = textEnter.merge(textElements);
            

//
//        // add the links and the arrows
//        var path = svg.append("svg:g").selectAll("path")
//            .data(force.links())
//            .enter().append("svg:path")
//            //    .attr("class", function(d) { return "link " + d.type; })
//            .attr("class", "link")
//            .attr("marker-end", "url(#end)");
//
//        // add the curvy lines
//        function tick() {
//            path.attr("d", function (d) {
//                var dx = d.target.x - d.source.x,
//                    dy = d.target.y - d.source.y,
//                    dr = Math.sqrt(dx * dx + dy * dy);
//                return "M" +
//                    d.source.x + "," +
//                    d.source.y + "A" +
//                    dr + "," + dr + " 0 0,1 " +
//                    d.target.x + "," +
//                    d.target.y;
//            });
//
//            node
//                .attr("transform", function (d) {
//                    return "translate(" + d.x + "," + d.y + ")";
//                });
//        }
//
        };
        
        //Update simulation. Inlucdes updateGraph, and redefining the 'tick' behaviour
        function updateSimulation() {
            updateGraph();
            
            simulation.nodes(nodes)
                .on('tick', function() {
                    nodeElements
                      .attr('cx', function (node) { return node.x })
                      .attr('cy', function (node) { return node.y })
                    textElements
                      .attr('x', function (node) { return node.x })
                      .attr('y', function (node) { return node.y })
                    linkElements
                      .attr('x1', function (link) { return link.source.x })
                      .attr('y1', function (link) { return link.source.y })
                      .attr('x2', function (link) { return link.target.x })
                      .attr('y2', function (link) { return link.target.y })
                    });
            
            simulation.force('link').links(links)
            simulation.alphaTarget(0.7).restart()
            
        };
    
        return graph
}