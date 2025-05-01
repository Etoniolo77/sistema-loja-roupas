import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

/**
 * A flexible chart component that can render different types of charts based on props
 * @param {Object} props - Component props
 * @param {string} props.type - Chart type: 'bar', 'pie', 'line', or 'area'
 * @param {Array} props.data - Data to be displayed in the chart
 * @param {string} props.title - Chart title
 * @param {string} props.dataKey - Primary data key for the chart
 * @param {string} props.nameKey - Name/category key for the chart
 * @param {Array} props.colors - Array of colors for the chart elements
 * @param {Object} props.config - Additional configuration options
 */
const ChartComponent = ({
  type = 'bar',
  data = [],
  title = '',
  dataKey = 'value',
  nameKey = 'name',
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
  config = {}
}) => {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">{title || 'Gráfico'}</Typography>
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Sem dados disponíveis para exibição
          </Typography>
        </Box>
      </Paper>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.bars ? (
                config.bars.map((bar, index) => (
                  <Bar 
                    key={bar.dataKey} 
                    dataKey={bar.dataKey} 
                    name={bar.name || bar.dataKey} 
                    fill={bar.color || colors[index % colors.length]} 
                  />
                ))
              ) : (
                <Bar dataKey={dataKey} fill={colors[0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={config.labelLine !== false}
                label={config.label !== false}
                outerRadius={config.outerRadius || 80}
                innerRadius={config.innerRadius || 0}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.lines ? (
                config.lines.map((line, index) => (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    name={line.name || line.dataKey}
                    stroke={line.color || colors[index % colors.length]}
                    activeDot={{ r: 8 }}
                  />
                ))
              ) : (
                <Line type="monotone" dataKey={dataKey} stroke={colors[0]} activeDot={{ r: 8 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.areas ? (
                config.areas.map((area, index) => (
                  <Area
                    key={area.dataKey}
                    type="monotone"
                    dataKey={area.dataKey}
                    name={area.name || area.dataKey}
                    stroke={area.color || colors[index % colors.length]}
                    fill={area.color || colors[index % colors.length]}
                    fillOpacity={0.3}
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={colors[0]}
                  fill={colors[0]}
                  fillOpacity={0.3}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <Typography variant="body1" color="error">
            Tipo de gráfico não suportado: {type}
          </Typography>
        );
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{title || 'Gráfico'}</Typography>
      {renderChart()}
    </Paper>
  );
};

export default ChartComponent;