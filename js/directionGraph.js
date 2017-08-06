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
    
    //Data entry point here
    var links = [], 
        nodes,
        radius = 10;

    //First run
    var firstRun = true;
    
    //Define force simulation objects -> link and sim
    var linkForce = d3.forceLink(links)
        .id(function(d) {return d.id}) //Accessor for name on node [optional];
        .distance(70)
    //.links(links) //Optional - 
    
    var simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-20)) //Defines the attraction of all nodes to center (gravity)
        .force("center", d3.forceCenter(width / 2, height / 2)) //Defines position of force center
        .force("link", linkForce)
        //.alphaTarget(0.5); //Insert link behaviour

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

    //Define transition timing
    var t = d3.transition().duration(1500);
    
    ///Convenient accessor
    graph = function () {
        return graph
    }

    //Method for updating the data from outside this scope
    graph.dataUpdate = function (data) {
        //We perform a deep copy to avoid altering the value outside
        //TODO: Improve performance here if slow
        //See: https://stackoverflow.com/questions/7486085/copying-array-by-value-in-javascript
        links = $.extend(true, [], data); //Copy values only, to prevent changing value on outside scope
        nodes = computeUniqueNodes(links);

        //console.log(nodes);
        updateGraph();
        updateSimulation();
    }

    
    //Compute the unique nodes based on the links
    function computeUniqueNodes(links) {
        //TODO: Function notes
        //Note: Will modify links in-place
        var new_nodes = {};
        
        links.forEach(function (link) {
            //Shitty javascript operation here. Return first value if truethy. Otherwise, second value
            //https://stackoverflow.com/questions/2802055/what-does-the-construct-x-x-y-mean/34707750
            link.source = new_nodes[link.source] || (new_nodes[link.source] = {
                id: link.source
            });
            link.target = new_nodes[link.target] || (new_nodes[link.target] = {
                id: link.target
            });
            link.value = +link.value;
        });
        
        new_nodes = d3.values(new_nodes);
        
        if (!firstRun) {
            //Perform left outer join to previous nodes to retain coordinates
            
            leftOuterJoin(new_nodes, nodes, "id", "id");
        }
        
        firstRun = false;
        return new_nodes
    }

    //Internal method for updating graph by taking the latest data, and replotting stuff
    //Uses lexical scoping for graphical elements
    function updateGraph() {
        //For links, nodes, and text, we follow the pattern of
        // .data() -> exit().remove() -> enter().append()

        linkElements = linkGroup.selectAll(".link")
            .data(links, function (link) {
                return link.source.id + "-" + link.target.id;
            }); //#Use unique name as data for reference
        
        linkElements.exit().transition(t)
            .attr("stroke-opacity", 0)
            //.attrTween("d", linkArc)
            .remove();

        var linkEnter = linkElements.enter()
            .append("path")
            .attr("class", "link")
            .call(function(link) { link.transition().attr("stroke-opacity", 1); })
            .attr("marker-end", "url(#end)"); //Reference the defined marker
        linkElements = linkEnter.merge(linkElements);

        // define the nodes
        nodeElements = nodeGroup.selectAll(".node")
            .data(nodes, function(node) {return node.id})
        
        nodeElements.exit().transition(t)
            .attr('r',0)
            .remove();
        
        var nodeEnter = nodeElements.enter()
            .append("circle")
            //.attr("r", 10)
            .attr("class", "node")
            .call(function(node) {node.transition(t).attr("r", radius)})
            .call(dragDrop);

        nodeElements = nodeEnter.merge(nodeElements);

        //Text
        textElements = textGroup.selectAll('text')
            .data(nodes, function(node) {return node.id}) //Specify name for constancy
        textElements.exit().remove();

        var textEnter = textElements.enter()
            .append('text')
            .text(function (d) {
                return d.id;
            })
            .attr("x", 12)
            .attr("dy", ".35em");
        textElements = textEnter.merge(textElements);
    };
    
    //Update simulation. redefining the 'tick' behaviour
    function updateSimulation() {
        //updateGraph();
        
        simulation.nodes(nodes)
            .on('tick', function () {
                nodeElements
                    .attr('cx', function (node) {return node.x = Math.max(radius, Math.min(width-radius, node.x));})
                    .attr('cy', function (node) {return node.y = Math.max(radius, Math.min(height-radius, node.y));})
                textElements
                    .attr('x', function (node) {return node.x})
                    .attr('y', function (node) {return node.y})
                linkElements.attr("d", linkArc);
            });
        simulation.force('link').links(links);
        simulation.alpha(0.1).alphaTarget(0.5).restart();

    };
    
    
    //Define elliptical arc path here - for 'd' attr of path
    function linkArc(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx*dx + dy*dy); //Arc radius
        return "M" + d.source.x + "," + d.source.y + "A" + dr*1.5 + "," + dr*1.5 + " 0 0,1 " + d.target.x + "," + d.target.y;
    }
    
    //For generic left outer join - used for updating data
    //Modifies the 
    //See http://learnjsdata.com/combine_data.html
    //For generic joining, see https://stackoverflow.com/questions/17500312/is-there-some-way-i-can-join-the-contents-of-two-javascript-arrays-much-like-i/17500836#17500836
    function leftOuterJoin(leftTable, rightTable, leftKey, rightKey) {
        var l = rightTable.length,
            m = leftTable.length,
            lookupIndex = [],
            output = [],
            tmp_key,
            toJoin;
        //Create lookup table to enable O(m+n) speeds
        for (var i = 0; i < l; i++) { // loop through l items
            var row = rightTable[i];
            lookupIndex[row[rightKey]] = row; // create an index for lookup table
        }
        for (var j = 0; j < m; j++) { // loop through m items
            tmp_key = leftTable[j][leftKey]
            toJoin = lookupIndex[tmp_key]
            if (toJoin != undefined) {
                leftTable[j].x = toJoin.x;
                leftTable[j].y = toJoin.y;
                leftTable[j].vx = 0; //toJoin.vx;
                leftTable[j].vy = 0; //toJoin.vy;
            }
//            
//            var y = leftTable[j];
//            var x = lookupIndex[y[leftKey]]; // get corresponding row from rightTable
//            output.push(select(y, x)); // select only the columns you need
        }
//        return output;
    };
        
    //==========DEBUGGING    
//    var a = {id: "a"},
//        b = {id: "b"},
//        c = {id: "c"},
//        //nodes = [a, b, c],
//        tmp_links = [];
//
//    d3.timeout(function() {
////        links = [{source: a, target: b},{source: b, target: c},{source: c, target: a}]
//////        nodes = [{id: "a"}, {id: "b"}, {id: "c"}]
////        nodes = [a, b,c]
//        tmp_links = [{source: 'a', target: 'b'},
//                    {source: 'b', target: 'c'},
//                    {source: 'c', target: 'a'}]
//////      links.push({source: a, target: b}); // Add a-b.
//////      links.push({source: b, target: c}); // Add b-c.
//////      links.push({source: c, target: a}); // Add c-a.
//      graph.dataUpdate(tmp_links);
//      updateGraph();
//      updateSimulation();
//    }, 1000);
//
//    
//    d3.interval(function() {
////        nodes = [{id: "a"}, {id: "b"}];
////        nodes = [a,b]
////        links = [{source:'a', target: 'b'}]
//        tmp_links = [{source:'a', target: 'b'}];
//    graph.dataUpdate(tmp_links);        
//      updateGraph();
//      updateSimulation();
//        console.log("Step1")
//    }, 2000, d3.now());
//
//    d3.interval(function() {
////        links = [{source: a, target: b},{source: b, target: c},{source: c, target: a}]
////        nodes = [{id: "a"}, {id: "b"}, {id: "c"}]
////        nodes = [a,b,c]
////        console.log(a);
//      tmp_links = [{source:'a', target: 'b'},
//              {source: 'b', target: 'c'},
//              {source:'c', target: 'a'},
//             {source:'c', target: 'e'}]
//     graph.dataUpdate(tmp_links);       
//      updateGraph();
//      updateSimulation();
//        console.log("Step2")
//    }, 3000, d3.now() + 1000);
    
    
    
    
    
    return graph
}