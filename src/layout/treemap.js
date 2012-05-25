// Squarified Treemaps by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
// Modified to support a target aspect ratio by Jeff Heer
d3.layout.treemap = function() {
  var hierarchy = d3.layout.hierarchy(),
      round = Math.round,
      size = [1, 1], // width, height
      padding = null,
      pad = d3_layout_treemapPadNull,
      sticky = false,
      stickies,
      ratio = 0.5 * (1 + Math.sqrt(5)); // golden ratio

  // Compute the area for each child based on value & scale.
  function scale(children, k) {
    var i = -1,
        n = children.length,
        child,
        area;
    while (++i < n) {
      area = (child = children[i]).value * (k < 0 ? 0 : k);
      child.area = isNaN(area) || area <= 0 ? 0 : area;
    }
  }

  function binarytree_children(children, sum, x, y, dx, dy) {
    if (children.length == 1)
    {
      children[0].x = x;
      children[0].y = y;
      children[0].dx = dx;
      children[0].dy = dy;
      return;
    }

    var midpoint = sum/2,
        pivot_index = 1,
        running_sum = children[0].area;
    for (var i = 1; i < children.length; i++)
    {
      if(running_sum >= midpoint)
      {
        pivot_index = i;
        break;
      }
      running_sum += children[i].area;
    }

    var half1 = children.slice(0, pivot_index),
        half2 = children.slice(pivot_index, children.length),
        half1_sum = running_sum,
        half2_sum = sum - running_sum,
        pivot_pct = running_sum / sum;

    if (dy > dx)
    {
      var y_pivot = Math.round(pivot_pct * dy);
      binarytree_children(half1, half1_sum, x, y, dx, y_pivot);
      binarytree_children(half2, half2_sum, x, y + y_pivot, dx, dy - y_pivot);
    }
    else
    {
      var x_pivot = Math.round(pivot_pct * dx);
      binarytree_children(half1, half1_sum, x, y, x_pivot, dy);
      binarytree_children(half2, half2_sum, x + x_pivot, y, dx - x_pivot, dy);
    }
  }

  function binarytree(node) {
    var children = node.children;

    if (children && children.length) {
      // recursively calculate sum values for all parent nodes that contain
      // children. we only need/want to do this once, so we check if we're at
      // the root node.
      if (!node.parent) {
        var sum_children = function(n) {
          if(n.children && n.children.length)
            n.value = d3.sum(n.children, sum_children);
          return n.value;
        };
        node.value = d3.sum(children, sum_children);
      }

      var rect = pad(node);
      node.area = rect.dx * rect.dy;

      // calculates children's areas
      scale(children, node.area / node.value);

      // subdivide our area proportionally between our direct children
      binarytree_children(children, node.area, rect.x, rect.y, rect.dx, rect.dy);

      // and recurse.
      children.forEach(binarytree);
    }
  }

  // Recursively resizes the specified node's children into existing rows.
  // Preserves the existing layout!
  function stickify(node) {
    var children = node.children;
    if (children && children.length) {
      var rect = pad(node),
          remaining = children.slice(), // copy-on-write
          child,
          row = [];
      scale(remaining, rect.dx * rect.dy / node.value);
      row.area = 0;
      while (child = remaining.pop()) {
        row.push(child);
        row.area += child.area;
        if (child.z != null) {
          position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
          row.length = row.area = 0;
        }
      }
      children.forEach(stickify);
    }
  }


  function treemap(d) {
    var nodes = stickies || hierarchy(d),
        root = nodes[0];
    root.x = 0;
    root.y = 0;
    root.dx = size[0];
    root.dy = size[1];
    if (stickies) hierarchy.revalue(root);
    scale([root], root.dx * root.dy / root.value);
    (stickies ? stickify : binarytree)(root);
    if (sticky) stickies = nodes;
    return nodes;
  }

  treemap.size = function(x) {
    if (!arguments.length) return size;
    size = x;
    return treemap;
  };

  treemap.padding = function(x) {
    if (!arguments.length) return padding;

    function padFunction(node) {
      var p = x.call(treemap, node, node.depth);
      return p == null
          ? d3_layout_treemapPadNull(node)
          : d3_layout_treemapPad(node, typeof p === "number" ? [p, p, p, p] : p);
    }

    function padConstant(node) {
      return d3_layout_treemapPad(node, x);
    }

    var type;
    pad = (padding = x) == null ? d3_layout_treemapPadNull
        : (type = typeof x) === "function" ? padFunction
        : type === "number" ? (x = [x, x, x, x], padConstant)
        : padConstant;
    return treemap;
  };

  treemap.round = function(x) {
    if (!arguments.length) return round != Number;
    round = x ? Math.round : Number;
    return treemap;
  };

  treemap.sticky = function(x) {
    if (!arguments.length) return sticky;
    sticky = x;
    stickies = null;
    return treemap;
  };

  treemap.ratio = function(x) {
    if (!arguments.length) return ratio;
    ratio = x;
    return treemap;
  };

  return d3_layout_hierarchyRebind(treemap, hierarchy);
};

function d3_layout_treemapPadNull(node) {
  return {x: node.x, y: node.y, dx: node.dx, dy: node.dy};
}

function d3_layout_treemapPad(node, padding) {
  var x = node.x + padding[3],
      y = node.y + padding[0],
      dx = node.dx - padding[1] - padding[3],
      dy = node.dy - padding[0] - padding[2];
  if (dx < 0) { x += dx / 2; dx = 0; }
  if (dy < 0) { y += dy / 2; dy = 0; }
  return {x: x, y: y, dx: dx, dy: dy};
}
