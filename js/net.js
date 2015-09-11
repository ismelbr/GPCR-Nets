buildNet = function(jsonFile) {

	inputJSONFile = jsonFile;
	
    windowResize();

    margen_Width = 20;
    magen_Height = 20;

	width = width - margen_Width;
	height = (height - magen_Height);
	color = d3.scale.category10();

	force = d3.layout.force()
	/* .charge(-120) */
	.charge(-height * 0.1)
	.linkDistance(height * 0.1)
	.size([ width, height ]);
	/*.gravity(0.05)
    .charge(function(d, i) {
        return i ? 0 : -2000;
    }).size([ width, height ]);*/

	/*
	 * .style("border-color", "gray") .style("border-style", "solid")
	 * .style("border-width", "1px");
	 */

	d3.json(jsonFile, function(error, g) {
		
		graph = g;
		graphRec = JSON.parse(JSON.stringify(g));
		nodeMap = new Object();

		for (var i = 0; i < graph.nodes.length; i++) {
			n = graph.nodes[i];
			nodeMap[n.name] = n;
		}

		update();

		var availableReceptors = [];

		var n = 0;
		for (var nodeName in nodeMap) {
			availableReceptors[n] = nodeName;
			n++;
		}
		
		$("#receptors").autocomplete({
			source : availableReceptors
		});
		
		d3.select('#receptors').style('display', 'inline');
		d3.select("label[for='receptors']").style('display', 'inline');

		
	});	
};

function findInteractingReceptorsFor(receptorName) {
	var interactingReceptorArray = new Array();
	
	for (var i = 0; i < graph.links.length; i++) {
		var interactingCouple = new Object();
		
		var link = graph.links[i];
		interactingCouple.theOtherName = "";
		if (link.source.name == receptorName) {
			interactingCouple.theOtherName = link.target.name;
			interactingCouple.theOtherUniProt = link.target.uniProtId;
			interactingCouple.references = link.references;
		} else if (link.target.name == receptorName) {
			interactingCouple.theOtherName = link.source.name;
			interactingCouple.theOtherUniProt = link.source.uniProtId;
			interactingCouple.references = link.references;
		}

		if (interactingCouple.theOtherName != "") {
			interactingReceptorArray[interactingCouple.theOtherName] = interactingCouple;
		}
	}

	return interactingReceptorArray;

}

var padding = 5; // separation between circles 

function collide(alpha) {
  var quadtree = d3.geom.quadtree(graph.nodes);
  return function(d) {
    var rb = 2 * d.node_size + padding,
        nx1 = d.x - rb,
        nx2 = d.x + rb,
        ny1 = d.y - rb,
        ny2 = d.y + rb;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y);
          if (l < rb) {
          l = (l - rb) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

function update() {
	showTopologicalProperties();
	$('.tooltip').hide();
	
	d3.select("svg").remove();
	d3.select("#zoom-range").remove();
	d3.select("#less-zoom").remove();
	d3.select("#more-zoom").remove();
	
	d3.select("body").append("label").attr("id", "less-zoom").html("Zoom -").style('position', 'fixed').style('left',
			((width + margen_Width)/2) - 110 + "px").style('bottom', "7px");
	
	d3.select("body").append("input").attr("type", "range").attr("class", "zoom-range")
	        .attr("id", "zoom-range").attr("min", "0.3").attr("max", "3").attr(
	                "step", "0.1").attr("value", "1").style('position', 'fixed').style('left',
							((width + margen_Width)/2) - 50 + "px").style('width', "100px").style('bottom', "7px").on("change", range_change);
	
	d3.select("body").append("label").attr("id", "more-zoom").html("+").style('position', 'fixed').style('left',
			((width + margen_Width)/2) + 60 + "px").style('bottom', "7px");
		
	svg = d3.select("body").append("svg").attr("width", width).attr("height",
			height).attr("pointer-events", "all").append('g').attr("id", "g").call(d3.behavior.zoom().scaleExtent([ 0.3, 3 ]).on("zoom", zoom)).append("g");

	force.nodes(graph.nodes).links(graph.links).start();

	var link = svg.selectAll(".link").data(graph.links).enter().append("line")
	        .attr("class", "link").style("stroke-width", 1.5)
			.attr("class", "link").style("stroke-dasharray", function(d) {
				if (d.value == 1) {
					return "none";
				} else {
					return "5, 5";
				}
			});

	/*var link = svg.selectAll(".link").data(graph.links).enter().append("path")
	        .attr("class", "link").style("stroke-width", function(d) {
				return 1;
			}).attr("class", "link").style("stroke-dasharray", function(d) {
				if (d.value == 1) {
					return "none";
				} else {
					return "5, 5";
				}
			});*/


	var gnodes = svg.selectAll("g.gnode").data(graph.nodes).enter().append("g")
			.classed("gnode", true).attr("class", "node").attr("name",
					function(d) {
						return d.name;
					}).attr("uniprotId", function(d) {
						return d.uniProtId;
					}).attr("r", function(d) {
						return d.node_size;
					}).style("fill", 	function(d) {
						return getNodeColor(d.group);
			}).call(force.drag);

	// Add one circle in each group
	var node = gnodes.append("circle").attr("class", "node").attr("name", function(d) {
				return d.name;
			}).attr("uniprotId", function(d) {
				return d.uniProtId;
			}).attr("r", function(d) {
				return d.node_size;
			}).style("fill", function(d) {
				return getNodeColor(d.group);
			}).attr("title", function(d) { 
				return 'The receptor "' + d.name + '" belongs to "' + d.family + "' family.";
			}).call(force.drag);

	$("svg circle").tooltip({
        'container': 'body',
        'placement': 'bottom',
    });

	// Append the labels to each group
	var labels = gnodes.append("text").text(function(d) {
		return d.name;
	}).attr("dy", ".4em").attr("fill", "black").attr("stroke", "none");

	/*
	 * node.append("title") .text(function(d) { return d.name; });
	 */

	svg.selectAll("circle").on("click", function() {
		onNodeClick(findNode(d3.select(this).attr("name")));
	});

	force.on("tick", function() {
		link.attr("x1", function(d) {
			return d.source.x;
		}).attr("y1", function(d) {
			return d.source.y;
		}).attr("x2", function(d) {
			return d.target.x;
		}).attr("y2", function(d) {
			return d.target.y;
		});

		//alert(graph.nodes.length + ' ' + graphRec.nodes.length)

		if (graph.nodes.length < graphRec.nodes.length) {
			node.each(collide(0.2)); //Added 
		}
			
		/*link.attr("d", function(d) {
			var dx = d.target.x - d.source.x,
      			dy = d.target.y - d.source.y,
      			dr = Math.sqrt(dx * dx + dy * dy);
  			return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
		});*/

		// Translate the groups
		gnodes.attr("transform", function(d) {
			return 'translate(' + [ d.x, d.y ] + ')';
		});
	});
	
	showLegend();
}

function getNodeColor(g) {
	return color(g);
}

function neightborsSubGraph(nodeName) {

	var newNodes = [];
	var newLinks = [];

	selectedNode = findNode(nodeName);
	
	if (selectedNode == null) {
		selectedNode = nodeMap[nodeName];
	}
	
	newNodes[newNodes.length] = selectedNode

	graphRec.links.forEach(function(link){
		if (graphRec.nodes[link.source].name == nodeName) {
			newLinks[newLinks.length] = {'source': 0, 'target': newNodes.length, 'value': link.value, "references": link.references};
			newNodes[newNodes.length] = graphRec.nodes[link.target];
		} else if (graphRec.nodes[link.target].name == nodeName) {
			newLinks[newLinks.length] = {'source': newNodes.length, 'target': 0, 'value': link.value, "references": link.references};
			newNodes[newNodes.length] = graphRec.nodes[link.source];
		}
	});

	graph.nodes = newNodes;
	graph.links = newLinks;
}

function findNode(nodeName) {
	for (var i = 0; i < graph.nodes.length; i++) {
		if (graph.nodes[i].name == nodeName) {
			return graph.nodes[i];
		}
	}
}

function onNodeClick(selectedNode) {
	closepop();
	
	/*d3.select('#receptors').style('display', 'none');
	d3.select("label[for='receptors']").style('display', 'none');*/

	//console.debug(selectedNode);
	nodeName = selectedNode.name;
	receptorUniPropLink = selectedNode.uniProtId;

	neightborsSubGraph(nodeName);

	update();
	
	document.getElementById("zoom-range").value = 1.3;
	range_change();

	d3.select('#my_custom_menu').style('display','block');

	//d3.event.preventDefault();

	var interactingReceptors = findInteractingReceptorsFor(nodeName);
	
	var tableStr = "<table>";
	tableStr += "<tr>";
	tableStr += "<th> Receptor pair </th>";
	tableStr += "<th> References </th>";
	tableStr += "</tr>";
	
	for (var interactingReceptor in interactingReceptors) {
		var interactingData = interactingReceptors[interactingReceptor];
		var uniprotLink = interactingData.theOtherUniProt;
		var references = interactingData.references;
		//console.debug(references);
		
		tableStr += "<tr>";	
		tableStr += 
				'<td><a href="' 
						+ receptorUniPropLink + '" target="_blank">' + nodeName
								+ '</a> - <a href="' + uniprotLink + '" target="_blank">'
						+ interactingReceptor + '</a></td>';
		
		tableStr += "<td>";
		
		if (references != null) {
			var nRefs = references.length;
			var i = 1;
			for(var refIndex in references) {
				//console.debug(refIndex);
			
				var referenceId = references[refIndex].refId;
				var referenceLink = references[refIndex].refLink;
			
				if (i == nRefs) {
					tableStr += 
						'<a href="' + referenceLink + '" target="_blank">'
							+ referenceId + '</a>';
				} else {
					tableStr += 
						'<a href="' + referenceLink + '" target="_blank">'
							+ referenceId + '</a>, ';
				}
			
				i++;
			}
		} 
		tableStr += "</td>";
		tableStr += "</tr>";
		
	}
	
	tableStr += "</table>";
	$('#my_custom_menu p').prepend(tableStr);

	var interactWord = "Interactions";
	if (inputJSONFile === "data/negative.json") {
		interactWord = "Non-interactions";
	}

	$('#my_custom_menu p').prepend('<h3>' + interactWord + '</h3>');
}

function getFamilyNames() {
	var familyNameMap = new Object();
	
	for(var i = 0; i < graph.nodes.length; i++) {
		if (!(graph.nodes[i].group in familyNameMap)) {
		//if (familyNameMap.indexOf(graph.nodes[i].group) == -1) {
			familyNameMap[graph.nodes[i].group] = graph.nodes[i].family;
		}
	}
	
	return familyNameMap;
}

function showLegend() {
	$('#legend p').empty();
	
    var familyNameMap = getFamilyNames();
    //console.debug(familyNameMap);
    for(var familyId in familyNameMap) {
    	$('#legend p').append('<label style="color:' + getNodeColor(familyId) + '";>' + familyNameMap[familyId] +'</label><br>');
    }
}

function showTopologicalProperties() {
	$('#net_data p').empty();
	$('#net_data p').append("Num. of protomers = " + graph.nodes.length + "<br>");
	
	var interactWord = "interactions";
	if (inputJSONFile === "data/negative.json") {
		interactWord = "non-interactions";
	}
	
	$('#net_data p').append("Num. of " + interactWord + " = " + graph.links.length + "<br>");
	
	$('#net_data p').append("For further info <a href='http://www.mdpi.com/1422-0067/15/5/8570' target='_blank'>click here</a><br>");
}

function closepop() {
	$('#my_custom_menu p').empty();
	$('#receptors').val("");
	d3.select('#my_custom_menu').style('display', 'none');
}

function zoom() {
    svg.attr("transform", "translate(" + d3.event.translate + ")"
            + " scale(" + d3.event.scale + ")");
    document.getElementById("zoom-range").value = d3.event.scale;
}

function range_change() {
	
	var scale = document.getElementById("zoom-range").value;
	
    x = (width/2) - (width*scale/2);
    y = (height/2) - (height*scale/2);

    svg.attr("transform", "translate(" + x + "," + y + ")" + "scale("
            + scale + ")");
}

function windowResize(){
	width = $(window).width();
	height = $(window).height();
}