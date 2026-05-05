import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function ObjectionEngagementCard({
  averageCallTime = "1m 18s",
  topThreeObjections = [
    { objection: "Not interested", percentage: 100 },
    { objection: "", percentage: 0 },
    { objection: "", percentage: 0 }
  ],
  engagementPercent = "Leads stay on the line for 100% of the call.",
  kpiData = null
}) {
  // Prepare chart data from objections
  const getChartData = () => {
    const validObjections = topThreeObjections.filter(obj => obj.objection && obj.percentage > 0);
    
    if (validObjections.length === 0) {
      return [
        { name: 'Not interested', value: 100, color: '#3B82F6' }
      ];
    }
    
    return validObjections.map((obj, index) => {
      const colors = ['#3B82F6', '#10B981', '#F59E0B'];
      return {
        name: obj.objection,
        value: obj.percentage,
        color: colors[index % colors.length]
      };
    });
  };

  const reportData = getChartData();

  // PDF Generation Function
  const generatePDF = async () => {
    try {
      // Ensure this runs only in browser environment
      if (typeof window === 'undefined') {
        throw new Error('PDF generation is only supported in browser environment');
      }
      
      // Dynamic import for jsPDF and autotable to avoid SSR issues
      const jsPDFModule = await import('jspdf');
      const JsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new JsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text('Quick Analysis', 20, 30);
      
      // Add date
      const currentDate = new Date().toLocaleDateString();
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated on: ${currentDate}`, 20, 40);
      
      // KPI Section
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text('Key Performance Indicators', 20, 60);
      
      const fmtCount = (v) => (typeof v === 'number' && !isNaN(v)) ? v.toLocaleString() : '0';
      const kpiTableData = [
        ['Metric', 'Value'],
        ['Average Call Time', averageCallTime || 'N/A'],
        ['Engagement Rate', engagementPercent || 'N/A'],
        ['Total Leads', fmtCount(kpiData?.total_leads)],
        ['Inbound Calls', fmtCount(kpiData?.total_inbound_calls_received)],
        ['Voicemails Sent', fmtCount(kpiData?.total_voicemail_sent)],
        ['Emails Sent', fmtCount(kpiData?.total_email_sent)]
      ];
      
      autoTable(doc, {
        head: [kpiTableData[0]],
        body: kpiTableData.slice(1),
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20 }
      });
      
      // Objections Section
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 120;
      doc.text('Top Objections', 20, finalY + 20);
      
      const objectionTableData = [
        ['Objection', 'Percentage']
      ];
      
      topThreeObjections.forEach(obj => {
        if (obj.objection || obj.percentage > 0) {
          objectionTableData.push([
            obj.objection || 'No objection',
            `${obj.percentage}%`
          ]);
        }
      });
      
      autoTable(doc, {
        head: [objectionTableData[0]],
        body: objectionTableData.slice(1),
        startY: finalY + 30,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20 }
      });
      
      // Save the PDF
      doc.save(`yearly_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Detailed error info:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert('Failed to generate PDF. Detailed error information has been logged to the console. Please check the browser console or ensure that required dependencies are installed.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6 h-full min-h-[500px] flex flex-col">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Analysis</h3>
      
      <div className="flex-1 flex flex-col justify-between">
        {/* Pie Chart Section */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-56 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {reportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-6 mt-6">
          {/* Statistics */}
          <div className="space-y-4">
            {reportData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-lg">{item.value}%</span>
              </div>
            ))}
          </div>

          {/* KPI Metrics */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Avg Call Time</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{averageCallTime}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-gray-600 dark:text-gray-300">Engagement</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white text-right max-w-[150px]">
                100%
              </span>
            </div>
          </div>

          {/* PDF Report Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">PDF Report</h4>
            <button
              onClick={generatePDF}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors transform hover:scale-105 duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}