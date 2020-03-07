import {
  Component,
  OnInit,
  OnChanges,
  ViewChild,
  ElementRef,
  Input,
  ViewEncapsulation
} from '@angular/core';
import * as d3 from 'd3';
import tip from 'd3-tip';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BarChartComponent implements OnInit, OnChanges {
  @ViewChild('chart') private chartContainer: ElementRef;
  @Input() data: Array<any>;
  @Input() labels: any;
  private margin: any = { top: 20, bottom: 50, left: 70, right: 20 };
  private chart: any;
  private width: number;
  private height: number;
  private xScale: any;
  private yScale: any;
  private colors: any;
  private xAxis: any;
  private yAxis: any;
  private tip = tip().html(function(d) {
    return d;
  });

  ngOnInit() {
    if (this.data) {
      this.createChart();
      this.updateChart();
    }
  }

  ngOnChanges() {
    if (this.data) {
      this.createChart();
    }
    if (this.chart) {
      this.updateChart();
    }
  }

  createChart() {
    const commaFormat = d3.format(',');
    const element = this.chartContainer.nativeElement;
    // width of the whole chart
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', element.offsetHeight)
      .attr('id', this.labels.uniqueName)
      .call(this.responsivefy);
    svg.call(this.tip);
    // chart plot area
    this.chart = svg
      .append('g')
      .attr('class', 'bars')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    // define X & Y domains
    const xDomain = this.data.map(d => d.status);
    const yDomain = [0, d3.max(this.data, d => d.quantity)];

    // create scales
    // horizontal
    this.xScale = d3
      .scaleBand()
      .padding(0.4)
      .domain(xDomain)
      .rangeRound([0, this.width]);
    // vertical
    this.yScale = d3
      .scaleLinear()
      .domain(yDomain)
      .range([this.height, 0]);

    // x & y axis ( what you see )
    this.xAxis = svg
      .append('g')
      .attr('class', 'axis axis-x')
      .attr(
        'transform',
        `translate(${this.margin.left}, ${this.margin.top + this.height})`
      )
      .call(d3.axisBottom(this.xScale));
    const numberFormat = this.labels.title.includes('Amount') ? '$' : '';
    this.yAxis = svg
      .append('g')
      .attr('class', 'axis axis-y')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .call(
        d3.axisLeft(this.yScale).tickFormat(function(d) {
          return numberFormat + commaFormat(d.quantity);
        })
      );
    this.tip
      .attr('class', 'd3-tip')
      .offset([-3, 0])
      .html(d => {
        return (
          // tslint:disable-next-line:quotemark
          "<span style='color:#5d5d5d'>" +
          d.status +
          '</span>' +
          '<br>' +
          // tslint:disable-next-line:quotemark
          "<span style='color:#00629B'>" +
          numberFormat +
          commaFormat(d.quantity) +
          '</span>'
        );
      });
    // bar colors
    this.colors = d3
      .scaleLinear()
      .domain([0, this.data.length])
      .range(<any[]>['#bfefff', 'blue']);
  }

  updateChart() {
    // update scales & axis
    this.xScale.domain(this.data.map(d => d.status));
    this.yScale.domain([0, d3.max(this.data, d => d.quantity)]);
    const commaFormat = d3.format(',');
    this.xAxis.transition().call(d3.axisBottom(this.xScale));
    this.colors.domain([0, this.data.length]);
    if (this.labels.title.includes('Amount')) {
      this.yAxis.transition().call(
        d3.axisLeft(this.yScale).tickFormat(function(d) {
          return '$' + commaFormat(d);
        })
      );
    } else {
      this.yAxis.transition().call(d3.axisLeft(this.yScale));
    }

    this.yAxis.select('.domain').remove();
    // update the bars in the graph
    const update = this.chart.selectAll('.bar').data(this.data);

    // remove exiting bars
    update.exit().remove();

    // update existing bars
    this.chart
      .selectAll('.bar')
      .transition()
      .attr('x', d => this.xScale(d.status))
      .attr('y', d => this.yScale(d.quantity))
      .attr('width', d => this.xScale.bandwidth())
      .attr('height', d => this.height - this.yScale(d.quantity))
      .style('fill', (d, i) => this.colors(i));
    // add new bars
    update
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('class', this.labels.uniqueName)
      .attr('x', d => this.xScale(d.status))
      .attr('y', d => this.yScale(0))
      // width of the bar
      .attr('width', this.xScale.bandwidth())
      .attr('height', 0)
      .style('fill', '#00BAFF')
      // mouse hover effects
      .on('mouseover', (selectedBar, index, node) => {
        // parse the class name from the rect node and do 2 effects
        d3.selectAll('.' + node[index].className.baseVal)
          .filter(function(d, i) {
            return JSON.stringify(selectedBar) !== JSON.stringify(d);
          })
          .transition()
          .style('opacity', 0.5);
        this.tip.show(selectedBar, node[index]);
      })
      .on('mouseout', (selectedBar, index, node) => {
        this.tip.hide(selectedBar, node[index]);
        d3.selectAll('.' + node[index].className.baseVal)
          .filter(function(d, i) {
            return JSON.stringify(selectedBar) !== JSON.stringify(d);
          })
          .transition()
          .style('opacity', 1);
      })
      .transition()
      .delay((d, i) => i * 10)
      .attr('y', d => this.yScale(d.quantity))
      .attr('height', d => this.height - this.yScale(d.quantity));
  }

  responsivefy = svg => {
    // container will be the DOM element
    // that the svg is appended to
    // we then measure the container
    // and find its aspect ratio
    const container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style('width'), 10),
      height = parseInt(svg.style('height'), 10),
      aspect = width / height;

    // set viewBox attribute to the initial size
    // control scaling with preserveAspectRatio
    // resize svg on inital page load
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMid')
      .call(resize);

    // add a listener so the chart will be resized
    // when the window resizes
    window.addEventListener('resize', resize);

    // this is the code that resizes the chart
    // it will be called on load
    // and in response to window resizes
    // gets the width of the container
    // and resizes the svg to fill it
    // while maintaining a consistent aspect ratio
    function resize() {
      const w = parseInt(container.style('width'), 10);
      svg.attr('width', w);
      svg.attr('height', Math.round(w / aspect));
    }
    // tslint:disable-next-line:semicolon
  };
}
