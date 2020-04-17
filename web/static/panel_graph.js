import * as util from "./util.js";
import * as model from "./model.js";
import * as api from "./api.js";
import * as panel_info from "./panel_item_info.js";

export function newGraphPanel( a_frame, a_parent ){
    return new GraphPanel( a_frame, a_parent );
}

function GraphPanel( a_id, a_frame, a_parent ){

    //var graph_div = $(a_id,a_frame);
    var inst = this;
    var node_data = [];
    var link_data = [];
    var graph_center_x = 200;
    var nodes_grp = null;
    var nodes = null;
    var links_grp = null;
    var links = null;
    var svg = null;
    var simulation = null;
    var sel_node = null;
    var focus_node_id, sel_node_id, r = 10;

    this.load = function( a_id, a_sel_node_id ){
        focus_node_id = a_id;
        sel_node_id = a_sel_node_id?a_sel_node_id:a_id;
        sel_node = null;

        //console.log("owner:",a_owner);
        api.dataGetDepGraph( a_id, function( a_data ){
            console.log("dep data:",a_data);
            var item, i, j, dep, node;

            link_data = [];

            var new_node_data = [];
            var id,id_map = {};

            for ( i in a_data.item ){
                item = a_data.item[i];
                //console.log("node:",item);
                node = {id:item.id,locked:item.locked,links:[]};
                if ( item.alias ){
                    node.label = item.alias;
                }else
                    node.label = item.id;

                if ( item.gen != undefined ){
                    node.row = item.gen;
                    node.col = 0;
                }

                if ( item.id == a_id ){
                    node.comp = true;
                }

                if ( item.id == sel_node_id ){
                    sel_node = node;
                }

                id_map[node.id] = new_node_data.length;
                new_node_data.push(node);
                for ( j in item.dep ){
                    dep = item.dep[j];
                    id = item.id+"-"+dep.id;
                    link_data.push({source:item.id,target:dep.id,ty:model.DepTypeFromString[dep.type],id:id});
                }
            }

            for ( i in link_data ){
                dep = link_data[i];

                node = new_node_data[id_map[dep.source]];
                node.links.push(dep);
                node = new_node_data[id_map[dep.target]];
                node.links.push(dep);
            }

            // Copy any existing position data to new nodes
            var node2;
            for ( i in node_data ){
                node = node_data[i];
                if ( id_map[node.id] != undefined ){
                    node2 = new_node_data[id_map[node.id]];
                    node2.x = node.x;
                    node2.y = node.y;
                }
            }

            node_data = new_node_data;

            if ( !sel_node ){
                if ( node_data.length ){
                    sel_node = node_data[0];
                    sel_node_id = sel_node.id;
                }else{
                    sel_node_id = null;
                }
            }

            renderGraph();
            panel_info.showSelectedInfo( sel_node_id );
        });
    };

    // TODO Why are IDs separate from data?

    this.update = function( a_ids, a_data ){
        // Only updates locked and alias of impacted nodes

        var ids = Array.isArray(a_ids)?a_ids:[a_ids];
        var data = Array.isArray(a_data)?a_data:[a_data];
        var i, node, item, render = false;

        for ( i = 0; i < ids.length; i++ ){
            node = findNodes( ids[i] );
            if ( node ){
                render = true;
                item = data[i];

                node.locked = item.locked;
                if ( item.alias ){
                    node.label = item.alias;
                }else
                    node.label = item.id;
            }
        }

        if ( render )
            renderGraph();
    };

    this.clear = function(){
        links_grp.selectAll("*").remove();
        nodes_grp.selectAll("*").remove();
        node_data = [];
        link_data = [];
    };

    this.resized = function( a_width, a_height ){
        graph_center_x = a_width/2;
    };

    this.getSelectedID = function(){
        if ( sel_node )
            return sel_node.id;
    };

    this.getSubjectID = function(){
        if ( focus_node_id )
            return focus_node_id;
    };

    function renderGraph(){
        var g;

        links = links_grp.selectAll('line')
            .data( link_data, function(d) { return d.id; });

        links.enter()
            .append("line")
                .attr('marker-start',function(d){
                    //console.log("link enter 1");
                    switch ( d.ty ){
                        case 0: return 'url(#arrow-derivation)';
                        case 1: return 'url(#arrow-component)';
                        default: return '';
                    }
                })
                .attr('marker-end',function(d){
                    //console.log("link enter 1");
                    switch ( d.ty ){
                        case 2: return 'url(#arrow-new-version)';
                        default: return '';
                    }
                })
                .attr('class',function(d){
                    //console.log("link enter 2");
                    switch ( d.ty ){
                        case 0: return 'link derivation';
                        case 1: return 'link component';
                        case 2: return 'link new-version';
                    }
                });

        links.exit()
            .remove();

        links = links_grp.selectAll('line');

        nodes = nodes_grp.selectAll('g')
            .data( node_data, function(d) { return d.id; });

        // Update
        nodes.select("circle.obj")
            .attr('class',function(d){
                var res = 'obj ';

                //console.log("upd node", d );

                if ( d.id == focus_node_id )
                    res += "main";
                else if ( d.row != undefined )
                    res += "prov";
                else{
                    //console.log("upd other node", d );
                    res += "other";
                }

                if ( d.comp )
                    res += " comp";
                else
                    res += " part";

                return res;
            });

        nodes.select("text.label")
            .text(function(d) {
                return d.label;
            })
            .attr('x', function(d){
                if ( d.locked )
                    return r + 12;
                else
                    return r;
            });

        nodes.select("text.locked")
            .html(function(d) {
                if (d.locked )
                    return "&#xe6bb";
                else
                    return "";
            });


        nodes.selectAll(".node > circle.select")
            .attr("class", function(d){
                if ( d.id == sel_node_id ){
                    //sel_node = d;
                    return "select highlight";
                }else
                    return "select hidden";
            });


        g = nodes.enter()
            .append("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragStarted)
                    .on("drag", dragged)
                    .on("end", dragEnded));

        g.append("circle")
            .attr("r", r)
            .attr('class',function(d){
                var res = 'obj ';
                //console.log("node enter 1");

                if ( d.id == focus_node_id )
                    res += "main";
                else if ( d.row != undefined )
                    res += "prov";
                else{
                    res += "other";
                    //console.log("new other node", d );
                }

                if ( d.comp )
                    res += " comp";
                else
                    res += " part";

                return res;
            })
            .on("mouseover",function(d){
                //console.log("mouse over");
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr('r',r*1.5);
            })
            .on("mouseout",function(d){
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr('r',r);
            })
            .on("click", function(d,i){
                if ( sel_node != d ){
                    d3.select(".highlight")
                        .attr("class","select hidden");
                    d3.select(this.parentNode).select(".select")
                        .attr("class","select highlight");
                    sel_node = d;
                    sel_node_id = d.id;
                    panel_info.showSelectedInfo( d.id );
                }

                if ( d3.event.ctrlKey ){
                    if ( d.comp )
                        inst.collapseNode();
                    else
                        inst.expandNode();
                }

                d3.event.stopPropagation();
            });

        g.append("circle")
            .attr("r", r *1.5)
            .attr("class", function(d){
                //console.log("node enter 3");

                if ( d.id == sel_node_id ){
                    //sel_node = d;
                    return "select highlight";
                }else
                    return "select hidden";
            });

        g.append("text")
            .attr("class","label")
            .text(function(d) {
                return d.label;
            })
            .attr('x', function(d){
                if ( d.locked )
                    return r + 12;
                else
                    return r;
            })
            .attr('y', -r);

        g.append("text")
            .attr("class","locked")
            .html(function(d) {
                if (d.locked )
                    return "&#xe6bb";
                else
                    return "";
            })
            .attr('x', r-3)
            .attr('y', -r+1);

        nodes.exit()
            .remove();

        nodes = nodes_grp.selectAll('g');

        if ( simulation ){
            //console.log("restart sim");
            simulation
                .nodes(node_data)
                .force("link").links(link_data);

            simulation.alpha(1).restart();
        }else{
            var linkForce = d3.forceLink(link_data)
                .strength(function(d){
                    switch(d.ty){
                        case 0: return 0.1;
                        case 1: return 0.1;
                        case 2: return 0.1;
                    }
                })
                .id( function(d) { return d.id; });

            simulation = d3.forceSimulation()
                .nodes(node_data)
                //.force('center', d3.forceCenter(200,200))
                .force('charge', d3.forceManyBody()
                    .strength(-300))
                .force('row', d3.forceY( function(d,i){ return d.row != undefined ?(75 + d.row*75):0; })
                    .strength( function(d){ return d.row != undefined ?0.05:0; }))
                .force('col', d3.forceX(function(d,i){ return d.col != undefined?graph_center_x:0; })
                    .strength( function(d){ return d.col != undefined ?0.05:0; }))
                .force("link", linkForce )
                .on('tick', simTick);

        }
    }

    function dragStarted(d) {
        //console.log("drag start",d.id);
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d3.event.sourceEvent.stopPropagation();
    }

    function dragged(d) {
        //console.log("drag",d3.event.x,d3.event.y);
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        simTick(); 
        d3.event.sourceEvent.stopPropagation();
    }

    function dragEnded(d){
        //console.log("drag end",d.id);
        if (!d3.event.active) simulation.alphaTarget(0);
        d.x = d.fx;
        d.y = d.fy;
        delete d.fx;
        delete d.fy;
        //console.log("at:",d);
        d3.event.sourceEvent.stopPropagation();
    }

    function findNodes( a_id ){
        for ( var i in node_data ){
            if ( node_data[i].id == a_id )
                return node_data[i];
        }
    }

    function graphLinkFind( a_id ){
        for ( var i in link_data ){
            if ( link_data[i].id == a_id )
                return link_data[i];
        }
    }

    this.expandNode = function(){
        if ( sel_node && !sel_node.comp ){
            //var exp_node = findNodes( sel_node )
            //sel_node_id
            api.dataGetDeps( sel_node_id, function( data ){
                //console.log("expand node data:",data);
                if ( data && data.item ){
                    var rec = data.item[0];
                    //console.log("node:",data);

                    sel_node.comp = true;

                    var dep,new_node,link,i,id;

                    //node = findNodes(sel_node_id);
                    //node.comp = true;

                    for ( i in rec.dep ){
                        dep = rec.dep[i];

                        if ( dep.dir == "DEP_IN" )
                            id = dep.id+"-"+rec.id;
                        else
                            id = rec.id+"-"+dep.id;

                        link = graphLinkFind( id );
                        if ( link )
                            continue;

                        link = {id:id,ty:model.DepTypeFromString[dep.type]};
                        if ( dep.dir == "DEP_IN" ){
                            link.source = dep.id;
                            link.target = rec.id;
                        }else{
                            link.source = rec.id;
                            link.target = dep.id;
                        }

                        sel_node.links.push(link);

                        new_node = findNodes(dep.id);
                        if ( !new_node ){
                            //console.log("adding node");
                            node_data.push({id:dep.id,label:dep.alias?dep.alias:dep.id,links:[link]});
                        }else{
                            new_node.links.push(link);
                        }

                        //console.log("adding link");

                        link_data.push(link);
                    }

                    renderGraph();
                }
            });
        }
    };

    this.collapseNode = function(){
        //console.log("collapse node");
        if ( sel_node ){
            var i, link, dest, loc_trim=[];

            sel_node.comp = false;

            for ( i = sel_node.links.length - 1; i >= 0; i-- ){
                link = sel_node.links[i];
                //console.log("lev 0 link:",link);
                dest = (link.source != sel_node)?link.source:link.target;
                graphPruneCalc( dest, [sel_node.id], sel_node );

                if ( !dest.prune && dest.row == undefined ){
                    graphPruneReset(-1);
                    link.prune += 1;
                    //graphPrune();
                }

                if ( dest.prune ){
                    //console.log("PRUNE ALL");
                    graphPrune();
                }else if ( dest.row == undefined ){
                    //console.log("PRUNE LOCAL EDGE ONLY");
                    graphPruneReset();
                    loc_trim.push(link);
                    //link.prune = true;
                    //graphPrune();
                }else{
                    //console.log("PRUNE NONE");
                    graphPruneReset();
                }
            }

            if ( loc_trim.length < sel_node.links.length ){
                for ( i in loc_trim ){
                    loc_trim[i].prune = true;
                }
                graphPrune();
            }

            //graphPruneReset();

            renderGraph();
        }
    };

    this.hideNode = function(){
        if ( sel_node && sel_node.id != focus_node_id && node_data.length > 1 ){
            sel_node.prune = true;
            // Check for disconnection of the graph
            var start = sel_node.links[0].source == sel_node?sel_node.links[0].target:sel_node.links[0].source;
            if ( graphCountConnected( start, [] ) == node_data.length - 1 ){
                for ( var i in sel_node.links ){
                    sel_node.links[i].prune = true;
                }
                graphPrune();

                sel_node = node_data[0];
                sel_node_id = sel_node.id;
                renderGraph();
            }else{
                sel_node.prune = false;
                util.setStatusText("Node cannot be hidden");
            }
        }
    };

    function graphCountConnected(a_node,a_visited,a_from){
        var count = 0;

        if ( a_visited.indexOf( a_node.id ) < 0 && !a_node.prune ){
            a_visited.push(a_node.id);
            count++;
            var link,dest;
            for ( var i in a_node.links ){
                link = a_node.links[i];
                if ( link != a_from ){
                    dest = (link.source == a_node?link.target:link.source);
                    count += graphCountConnected(dest,a_visited,link);
                }
            }
        }

        return count;
    }

    function graphPrune(){
        var i,j,item;

        for ( i = link_data.length - 1; i >= 0; i-- ){
            item = link_data[i];
            if ( item.prune ){
                //console.log("pruning link:",item);
                if ( !item.source.prune ){
                    item.source.comp = false;
                    j = item.source.links.indexOf( item );
                    if ( j != -1 ){
                        item.source.links.splice(j,1);
                    }else{
                        console.log("BAD INDEX IN SOURCE LINKS!");
                    }
                }
                if ( !item.target.prune ){
                    item.target.comp = false;
                    j = item.target.links.indexOf( item );
                    if ( j != -1 ){
                        item.target.links.splice(j,1);
                    }else{
                        console.log("BAD INDEX IN TARGET LINKS!");
                    }
                }
                link_data.splice(i,1);
            }
        }

        for ( i = node_data.length - 1; i >= 0; i-- ){
            item = node_data[i];
            if ( item.prune ){
                //console.log("pruning node:",item);
                node_data.splice(i,1);
            }
        }
    }

    function graphPruneReset(){
        var i;
        for ( i in node_data ){
            node_data[i].prune = false;
        }
        for ( i in link_data ){
            link_data[i].prune = false;
        }
    }


    function simTick() {
        //console.log("tick");
        nodes
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"; });

        links
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    }


    // Graph Init
    var zoom = d3.zoom();

    // TODO Select in our frame only
    svg = d3.select("svg")
    .call(zoom.on("zoom", function () {
        svg.attr("transform", d3.event.transform);
    }))
    .append("g");

    defineArrowMarkerDeriv(svg);
    defineArrowMarkerComp(svg);
    defineArrowMarkerNewVer(svg);

    links_grp = svg.append("g")
        .attr("class", "links");

    nodes_grp = svg.append("g")
        .attr("class", "nodes");

    return this;
}

// Depth-first-search to required nodes, mark for pruning
function graphPruneCalc( a_node, a_visited, a_source ){
    if ( a_visited.indexOf(a_node.id) < 0 ){
        a_visited.push(a_node.id);

        if ( a_node.row != undefined ){
            return false;
        }

        var i, prune, dest, link, keep = false;

        for ( i in a_node.links ){
            link = a_node.links[i];
            dest = (link.source != a_node)?link.source:link.target;
            if ( dest != a_source ){
                prune = graphPruneCalc( dest, a_visited, a_node );
                keep |= !prune;
            }
        }

        if ( !keep ){
            a_node.prune = true;
            for ( i in a_node.links )
                a_node.links[i].prune=true;
        }
    }

    return a_node.prune;
}

function defineArrowMarkerDeriv( a_svg ){
    a_svg.append('defs').append('marker')
        .attr('id','arrow-derivation')
        .attr('refX',-2.5)
        .attr('refY',2)
        .attr('orient','auto')
        .attr('markerWidth',5)
        .attr('markerHeight',4)
        .append('svg:path')
            .attr('class','arrow-path derivation')
            .attr('d', 'M 5,0 L 0,2 L 5,4');
}

function defineArrowMarkerComp( a_svg ){
    a_svg.append('defs').append('marker')
        .attr('id','arrow-component')
        .attr('refX',-2.5)
        .attr('refY',2)
        .attr('orient','auto')
        .attr('markerWidth',8)
        .attr('markerHeight',4)
        .append('svg:path')
            .attr('class','arrow-path component')
            .attr('d', 'M 4,0 L 0,2 L 4,4 L 8,2');
}

function defineArrowMarkerNewVer( a_svg, a_name ){
    a_svg.append('defs').append('marker')
        .attr('id','arrow-new-version')
        .attr('refX',8.5)
        .attr('refY',2)
        .attr('orient','auto')
        .attr('markerWidth',10)
        .attr('markerHeight',4)
        .append('svg:path')
            .attr('class','arrow-path new-version')
            .attr('d', 'M 2,0 L 6,2 L 2,4 M 4,2 L 0,4 L 0,0');
}

