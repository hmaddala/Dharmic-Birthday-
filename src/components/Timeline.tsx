import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export type ProjectionDate = {
  year: number;
  gregorianDate: string;
  weekday: string;
};

export const Timeline = ({ data }: { data: ProjectionDate[] }) => {
  const d3Container = useRef(null);

  useEffect(() => {
    if (data && d3Container.current) {
      d3.select(d3Container.current).selectAll('*').remove();

      const margin = { top: 20, right: 20, bottom: 30, left: 20 };
      const width = document.getElementById('timeline-wrapper')?.clientWidth || 600;
      const height = 120;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const paddingX = 40;
      const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year) as [number, number])
        .range([paddingX, innerWidth - paddingX]);

      // Draw timeline axis
      g.append('line')
        .attr('x1', 0)
        .attr('y1', innerHeight / 2)
        .attr('x2', innerWidth)
        .attr('y2', innerHeight / 2)
        .attr('stroke', '#e2d1b3')
        .attr('stroke-width', 2);

      const nodes = g.selectAll('.node')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${x(d.year)}, ${innerHeight / 2})`);

      // Draw points
      nodes.append('circle')
        .attr('r', 6)
        .attr('fill', '#daa520')
        .attr('stroke', '#8b0000')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function() { d3.select(this).attr('r', 8).attr('fill', '#8b0000'); })
        .on('mouseout', function() { d3.select(this).attr('r', 6).attr('fill', '#daa520'); });

      // Add year labels
      nodes.append('text')
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2d2a26')
        .text(d => d.year);

      // Add date labels
      nodes.append('text')
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#5c554a')
        .text(d => {
           // Parse YYYY-MM-DD
           const parts = d.gregorianDate.split('-');
           if(parts.length === 3) return `${parts[1]}/${parts[2]}`;
           return d.gregorianDate;
        });
    }
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div id="timeline-wrapper" className="w-full overflow-hidden my-6 bg-white border border-[#e2d1b3] rounded-[4px] p-4 flex flex-col items-center">
      <h4 className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 w-full text-center mb-2">5-Year Timeline Projection</h4>
      <div className="w-full relative min-h-[120px]" ref={d3Container}></div>
    </div>
  );
};
